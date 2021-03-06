import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from 'web3modal'
import { toast } from 'react-toastify'
import {
  marketplaceAddress
} from '../config'
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'

export default function Home() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  useEffect(() => {
    loadNFTs()
  }, [])

  /*
  *  map over items returned from smart contract and format 
  *  them as well as fetch their token metadata
  */
  async function loadNFTs() {
    /* create a generic provider and query for unsold market items */
    const provider = new ethers.providers.JsonRpcProvider("https://eth-rinkeby.alchemyapi.io/v2/gnnXL5HOoh1vU-lQ4fFl5ZntYuu9xFam")
    //console.log('1.1. provider------Success', provider)

    //console.log('1.02. marketplaceAddress, NFTMarketplace.abi, provider----', marketplaceAddress, NFTMarketplace.abi, provider)
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, provider)
    //console.log('1.2. contract------Success', contract)

    let data = null
    try {
      data = await contract.fetchMarketItems()
      //console.log('2.1. contract.fetchMarketItems------Success', data)
    } catch (error) {
      //console.log('2.2. contract.fetchMarketItems------failed', error)
      return toast.error(error || 'Error contract.fetchMarketItems')
    }

    /*
    *  map over items returned from smart contract and format 
    *  them as well as fetch their token metadata
    */
    try {
      const items = await Promise.all(data.map(async (i) => {
        const tokenUri = await contract.tokenURI(i.tokenId)
        const meta = await axios.get(tokenUri)
        const price = ethers.utils.formatUnits(i.price.toString(), 'ether')
        const item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
        }
        return item
      }))
      setNfts(items)
      setLoadingState('loaded')
      //console.log('3.1. get NFT List-----------Success', items)
    } catch (error) {
      //console.log('3.2. Error get NFT List-----------', error)
      setLoadingState('loaded')
      return toast.error(error || 'Error get NFT List')
    }
  }


  async function buyNft(nft) {
    /* needs the user to sign the transaction, so will use Web3Provider and sign it */
    const web3Modal = new Web3Modal()

    let connection = null
    try {
      connection = await web3Modal.connect()
      //console.log('1.1. Connection-----------Success', connection)
    } catch (error) {
      //console.log('1.2. Connection-----------Error', error)
      return toast.error(error || 'Error Connection')
    }

    const provider = new ethers.providers.Web3Provider(connection)
    //console.log('2. provider-----------Success', provider)

    const signer = provider.getSigner()
    //console.log('3. signer-----------Success', signer)

    //console.log('4.01. marketplaceAddress, NFTMarketplace.abi, signer----', marketplaceAddress, NFTMarketplace.abi, signer)
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    //console.log('4.2. contract------Success', contract)

    /* user will be prompted to pay the asking proces to complete the transaction */
    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether')
    //console.log('5. price------Success', price)

    let transaction = null
    try {
      transaction = await contract.createMarketSale(nft.tokenId, {
        value: price
      })
      //console.log('6.1. transaction-----------Success', transaction)
    } catch (error) {
      //console.log('6.2. transaction-----------Error', error)
      return toast.error(error || 'Error transaction')
    }

    try {
      await transaction.wait()
      loadNFTs()
      //console.log('7.1. transaction.wait-----------Success', transaction)
    } catch (error) {
      //console.log('7.2. transaction.wait-----------Error', error)
      return toast.error(error || 'Error transaction.wait')
    }
  }
  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>)
  return (
    <div className="flex justify-center">
      <div className="px-4" style={{ maxWidth: '1600px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
            nfts.map((nft, i) => (
              <Card sx={{ maxWidth: 345 }}>
                  <CardMedia
                    component="img"
                    height="300"
                    image={nft.image}
                    alt="green iguana"
                    sx={{
                      height: 200
                    }}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      name:{nft.name}
                    </Typography>
                    <Typography variant="h6"  color="text.secondary">
                      <b>description:</b>{nft.description}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      <b>price:</b>{nft.price}Eth
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => buyNft(nft)}>buy</Button>               
                  </CardActions>
              </Card>
            ))
          }
        </div>
      </div>
    </div>
  )
}