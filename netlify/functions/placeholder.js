// A placeholder function to ensure the netlify/functions directory is recognized
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Netlify Functions are working" })
  };
}; 