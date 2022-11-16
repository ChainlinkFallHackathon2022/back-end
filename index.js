import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import sharp from "sharp";
import formidable from "formidable";
import axios from "axios";
import { create } from "ipfs";
import OrbitDB from "orbit-db";
import cors from "cors";
import { createVerifier } from "fast-jwt";
import Web3 from "web3";
import { NFTStorage, Blob } from "nft.storage";

// ENVIROMENTS VARIABLES
dotenv.config({ silent: process.env.NODE_ENV === "production" });

// EXPRESS
const app = express();

// CORS
app.use(
  cors() // {origin: process.env.ORIGIN}
);

// BODY PARSER
const jsonParser = bodyParser.json({ limit: "30mb" });

// NFT.STORAGE
const client = new NFTStorage({
  token: process.env.NFT_STORAGE_KEY,
});

// WSS QUICKNODE PROVIDER
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(process.env.QUICKNODE_RPC)
);

// MIDDLEWARE API
function authenticateToken(req, res, next) {
  // QUERIES
  const wallet = req.query.wallet;

  // HEADERS
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // UNAUTHORIZED
  if (token === null || token === undefined) return res.sendStatus(401);

  // JWT VERIFIER
  const verify = createVerifier({
    key: async () => process.env.TOKEN_SECRET,
  });

  // VERIFY JWT
  return verify(token)
    .then((value) => {
      if (wallet === undefined || wallet === null) {
        return next();
      } else {
        // VERIFY WALLET SIGNATURE
        const message = "CHAINLINK HACKATHON 2022 | Welcome to grid bot";
        const walletSignature = web3.eth.accounts.recover(
          message,
          value.signature
        );

        // VERIFY IF WALLET IS THE OWNER
        if (wallet.toLowerCase() !== walletSignature.toLowerCase()) {
          // FORBIDDEN
          return res.sendStatus(403);
        } else {
          // NEXT
          return next();
        }
      }
    })
    .catch((err) => {
      console.log(err);
      // FORBIDDEN
      return res.sendStatus(403);
    });
}

// ORBIT-DB DOCUMENT
let docstore;

const createInstance = async () => {
  // SET IPFS CONFIG
  const ipfsConfig = {
    repo: "./nfts",
    start: false,
    EXPERIMENTAL: {
      pubsub: true,
    },
    // config: {
    //   Addresses: {
    //     Swarm: [
    //       "/dns4/gridbotapi-production.up.railway.app/tcp/4002/p2p/Qmdw7Bkmx9GveLcNtReuTAqpZ3qQMdrXFZMKFeivDpbfbL",
    //       "/dns4/gridbotapi-production.up.railway.app/tcp/4002/p2p/Qmdw7Bkmx9GveLcNtReuTAqpZ3qQMdrXFZMKFeivDpbfbL",
    //       "/dns4/gridbotapi-production.up.railway.app/tcp/4003/ws/p2p/Qmdw7Bkmx9GveLcNtReuTAqpZ3qQMdrXFZMKFeivDpbfbL",
    //     ],
    //   },
    // },
  };

  // SET ORBITDB CONFIG
  const orbitDbConfig = {
    offline: true, // FOR TESTS
    id: "test-local-node", // ID FOR LOCAL TESTS (REQUIRED IN OFFLINE MODE)
  };

  try {
    // CREATE IPFS INSTANCE
    const ipfs = await create(ipfsConfig);

    // CREATE ORBIT-DB INSTANCE
    const orbitdb = await OrbitDB.createInstance(ipfs, orbitDbConfig);

    // CONNECT TO ORBIT-DB JSON DOCUMENT
    docstore = await orbitdb.docstore("nfts");
    docstore.load();
  } catch (err) {
    console.log(err);
  }
};

// CREATE IPFS AND ORBIT-DB INSTANCES
createInstance();

const b64toBlob = ({ base64Data, contentType, sliceSize = 256 }) => {
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

// RESIZE IMAGE AND UPLOAD NFT METADATA TO NFT.STORAGE
app.post("/api/v1/nft/upload", authenticateToken, async (req, res) => {
  const form = formidable();
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      res.status(400).end();
    }

    const { width, height, name, description } = JSON.parse(fields.data);
    const originalImage = files.image.filepath;

    sharp(originalImage)
      .resize(width, height)
      .avif()
      .toBuffer()
      .then((result) => {
        const format = "base64";
        const base64Data = result.toString(format);
        const contentType = "image/avif";
        const image = b64toBlob({ base64Data, contentType });
        client
          .store({
            name,
            description,
            image,
          })
          .then((uri) => res.status(200).json(uri))
          .catch((err) => {
            console.log(err);
            res.status(400).end();
          });
      })
      .catch((err) => {
        console.log(err);
        res.status(400).end();
      });
  });
});

// CREATE OR UPDATE ORBIT-DB DOCUMENT
app.put(
  "/api/v1/nft/create",
  authenticateToken,
  jsonParser,
  async (req, res) => {
    const wallet = req.query.wallet;
    const { cid } = req.body;

    if (!docstore || wallet === null || cid === null)
      return res.status(400).end();

    let likes;
    // CHECK IF DOC EXISTS
    const info = docstore.get(cid);

    if (info.length > 0) {
      const { value, wallets } = info[0].likes;
      // UPDATE CHANGES

      // CHECK IF WALLET HAS GIVEN A LIKE
      const isWallet = wallets.find((user) => user === wallet);
      if (isWallet !== undefined) {
        // REMOVE LIKE
        const index = wallets.indexOf(wallet);
        wallets.splice(index, 1);
        likes = {
          value: value - 1,
          wallets: wallets,
        };
      } else {
        // ADD LIKE
        likes = {
          value: value + 1,
          wallets: wallets.concat([wallet]),
        };
      }
    } else {
      // NEW DOC
      likes = {
        value: 0,
        wallets: [],
      };
    }

    if (likes !== undefined)
      docstore.put({ _id: cid, likes }).then(() => res.status(200).end());
    // CREATE OR UPDATE DOC TO ORBIT-DB
  }
);

// RETRIEVE SPECIFIED CID FROM IPFS
app.get("/api/v1/nft/metadata/:cid", authenticateToken, (req, res) => {
  const cid = req.params.cid;
  axios
    .get(`https://${cid}.ipfs.nftstorage.link/metadata.json`)
    .then((response) => {
      if (docstore) {
        const info = docstore.get(cid);
        if (info.length > 0) {
          res.status(200).json(Object.assign(info[0], response.data));
        } else {
          res.status(200).json(response.data);
        }
      }
    })
    .catch((error) => {
      res.status(400).end();
    });
});

// RETRIEVE ALL CIDS FROM NFT.STORAGE API
app.get("/api/v1/nft/storage", authenticateToken, (req, res) => {
  const date = encodeURI(new Date().toISOString());
  const limit = 1000;

  axios
    .get(`https://api.nft.storage/?before=${date}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${process.env.NFT_STORAGE_KEY}`,
        "Content-Type": "application/json",
      },
    })
    .then((cids) => {
      res.status(200).json(cids.data);
    })
    .catch((err) => {
      res.status(400).end();
    });
});

// RETRIEVE SPECIFIED CID FROM NFT.STORAGE API
app.get("/api/v1/nft/storage/:cid", authenticateToken, (req, res) => {
  const cid = req.params.cid;
  axios
    .get(`https://api.nft.storage/${cid}`, {
      headers: {
        Authorization: `Bearer ${process.env.NFT_STORAGE_KEY}`,
        "Content-Type": "application/json",
      },
    })
    .then((cid) => {
      res.status(200).json(cid.data.value);
    })
    .catch((err) => {
      res.status(400).end();
    });
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
