import AWS = require('aws-sdk');

interface IMovie {
  name: string;
  director: string | null;
}

interface IResponse {
  statusCode: number;
  body: string;
}

const tableName = process.env.TABLE_NAME || '';
const tablePK = process.env.TABLE_PK || '';
const dynamo = new AWS.DynamoDB.DocumentClient();

const createResponse = (body: string | AWS.DynamoDB.DocumentClient.ItemList, statusCode = 200): IResponse => {
  return {
    statusCode,
    body: JSON.stringify(body, null, 2),
  };
};

const allMovies = async () => {
  const scanResult = await dynamo.scan({ TableName: tableName }).promise();
  return scanResult;
};

const oneMovie = async (movie: string) => {
  const params = { TableName: tableName, Key: { [tablePK]: movie } };
  return await dynamo.get(params).promise();
};

const addMovie = async (data: IMovie) => {
  if (data) await dynamo.put({ TableName: tableName, Item: data }).promise();
  return data;
};

const deleteMovie = async (data: { name: string }) => {
  const { name } = data;
  if (name) await dynamo.delete({ TableName: tableName, Key: { name } }).promise();
  return name;
};

exports.handler = async (event: AWSLambda.APIGatewayEvent) => {
  try {
    const { httpMethod, body: requestBody, queryStringParameters: params } = event;
    if (httpMethod === 'GET') {
      if (!params) {
        const response = await allMovies();
        return createResponse(response.Items || []);
      } else if (params.movie) {
        const { Item } = await oneMovie(params.movie);
        return createResponse(Item ? [Item] : []);
      }
    }

    if (!requestBody) {
      return createResponse('Missing request body', 500);
    }

    const data = JSON.parse(requestBody);

    if (httpMethod === 'POST') {
      const movie = await addMovie(data);
      return movie
        ? createResponse(`${JSON.stringify(data)} added to the database`)
        : createResponse('Movie is missing', 500);
    }

    if (httpMethod === 'DELETE') {
      const movie = await deleteMovie(data);
      return movie
        ? createResponse(`${JSON.stringify(data)} deleted from the database`)
        : createResponse('Movie is missing', 500);
    }

    return createResponse(`Ops, something wrong!`, 500);
  } catch (error) {
    console.log(error);
    return createResponse(error, 500);
  }
};
