const axios = require('axios')

const fetchExplorerData = async (path, params) => {
    
  let response = await axios.get(process.env.EXPLORER_API + path, {
    params: params, 
  });
  
  return response.data;

}

module.exports = fetchExplorerData;