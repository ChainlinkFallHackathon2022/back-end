<!-- TABLE OF CONTENTS -->

## Table of contents

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#configuration">Configuration</a>
       <ul>
        <li><a href="#instances">Instances</a></li>
        <li><a href="#enviroments-variables">Enviroments variables</a></li>
      </ul>
    </li>
    <li>
      <a href="#api-usage">API usage</a>
      <ul>
        <li><a href="#api-authorization">API authorization</a></li>
        <li><a href="#api-requests">API requests</a></li>
      </ul>
    </li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- GETTING STARTED -->

## Getting Started

### Prerequisites

- npm
  ```sh
  npm install npm@latest -g
  ```
- node.js version 16.16.0

### Installation

1. Clone the repository

   ```sh
    git clone https://github.com/ChainlinkFallHackathon2022/back-end.git
   ```

2. Change directory

   ```sh
    cd back-end
   ```

3. Install NPM packages
   ```sh
    npm install
   ```

<!-- CONFIG -->

## Configuration

### Instances

This configuration allow run instances in local node for tests

- IPFS

  ```js
  const ipfsConfig = {
    repo: "./nfts",
    start: false,
    EXPERIMENTAL: {
      pubsub: true,
    },
  };
  ```

- Orbit-DB
  ```js
  const orbitDbConfig = {
    offline: true,
    id: "test-local-node",
  };
  ```

### Enviroments variables

- Enter enviroments variables in `.env`
  ```
  PORT=
  ORIGIN=
  QUICKNODE_RPC=
  TOKEN_SECRET=
  NFT_STORAGE_KEY=
  ```

<!-- SETUP -->

## Setup

1. Run node
   ```sh
   npm run start
   ```

<!-- USAGE -->

## API usage

### API Authorization

This is required to check that the wallet trying to request something is actually the owner of the wallet.
Ex. Modify NFT likes in a orbitDB document.

- Install

  ```sh
  npm install fast-jwt web3
  ```

- Import

  ```js
  import web3 from "web3";
  import { createSigner } from "fast-jwt";
  ```

- Sign message with metamask wallet

  ```js
  const signature = await web3.metamask.eth.personal.sign(
    "ENTER_MESSAGE_TO_SIGN",
    "ENTER_SIGNER_ADDRESS"
  );
  ```

- Create JWT with wallet signature
  ```js
  const sign = createSigner({ key: 'ENTER_PRIVATE_KEY' });
  const jwt = sign({ signature: 'ENTER_WALLET_SIGNATURE });
  ```

### API requests

- Resize image and upload NFT metadata to NFT.STORAGE

  ```js
  const file = "IMAGE FILE OBJECT";
  const data = {
    width: "NEW IMAGE WIDTH",
    height: "NEW IMAGE HEIGHT",
    name: "NFT NAME",
    description: "NFT DESCRIPTION",
  };

  const formData = new FormData();
  formData.append("image", file, file.name);
  formData.append("data", data);

  fetch("http://localhost:5000/api/v1/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });
  ```

- Create new Orbit-DB document and store NFT likes

  ```js
  const wallet = "METAMASK_WALLET";
  const cid = "NFT_STORAGE_IPFS_CID";

  fetch(`http://localhost:5000/api/v1/nft/create?wallet=${wallet}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cid: cid,
    }),
  });
  ```

- Retrieve file CID from NFT.STORAGE and document from Orbit-DB.

  ```js
  const cid = "NFT_STORAGE_IPFS_CID";

  fetch(`http://localhost:5000/api/v1/nft/metadata/${cid}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  ```

- Retrieve stored file CID from NFT.STORAGE API

  ```js
  const cid = "NFT_STORAGE_IPFS_CID";

  fetch(`http://localhost:5000/api/v1/nft/storage/${cid}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  ```

- Retrieve all stored files from NFT.STORAGE API

  ```js
  fetch(`http://localhost:5000/api/v1/nft/storage`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  ```

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<!-- CONTACT -->

## Contact

- Leandro Labiano - Blockchain Developer - [@your_twitter](https://twitter.com/your_username) - email@example.com
- Guillermo Izquierdo - Full Stack Developer - [@S7Joms](https://twitter.com/S7Joms) - guille1000142@gmail.com
