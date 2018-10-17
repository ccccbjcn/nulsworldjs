import axios from 'axios'
import { hash_from_address } from '../wallet/model/data'
import {
  CHEAP_UNIT_FEE,
  Transaction, Coin} from '../model/transaction'

export async function get_outputs (address) {
  let response = await axios.get(`/addresses/outputs/${address}.json`)
  return response.data
}

export async function ipfs_push (value) {
  let response = await axios.post('/ipfs/add_json', value)
  if (response.data.hash !== undefined) {
    return response.data.hash
  } else {
    return null
  }
}

export async function ipfs_push_file (fileobject) {
  let formData = new FormData();
  formData.append('file', fileobject);

  let response = await axios.post( '/ipfs/add_file',
    formData,
    {
      headers: {
          'Content-Type': 'multipart/form-data'
      }
    }
  )

  if (response.data.hash !== undefined) {
    return response.data.hash
  } else {
    return null
  }
}

export async function prepare_remark_tx (address, remark) {
  let outputs_data = await get_outputs(address)

  let tx = Transaction.from_dict(
    {'inputs': [

    ],
    'outputs': [
      {address: hash_from_address(address),
        value: outputs_data.total_available}
    ],
    'type': 2,
    'scriptSig': '',
    'remark': remark
    }
  )

  let total_value = 0
  while (total_value < CHEAP_UNIT_FEE) {
    let utxo = outputs_data.outputs.shift()
    if (utxo === undefined) {
      break
    }

    total_value += utxo.value
    tx.inputs.push(Coin.from_dict({
      fromHash: utxo.hash,
      fromIndex: utxo.idx,
      value: utxo.value,
      lockTime: utxo.lockTime
    }))
  }
  tx.outputs[0].na = total_value - tx.calculate_fee()
  return tx
}

export async function create_post (address, post_type, content, title = null, ref = null) {
  let post_content = {
    'type': post_type,
    'content': {
      'body': content
    }
  }

  if (title !== null) {
    post_content.content.title = title
  }
  if (ref !== null) {
    post_content.ref = ref
  }

  let hash = await ipfs_push(post_content)
  let remark = `IPFS;P;${hash}`
  let tx = await prepare_remark_tx(address, remark)
  // tx.sign(Buffer.from(account.private_key, 'hex'))
  // let signed_tx = tx.serialize().toString('hex')
  return tx
}

export async function broadcast (tx) {
  let response = await axios.post('/broadcast', {
    txHex: this.signed_tx
  })
  return response.data.value;
}