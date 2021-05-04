import * as cdk from '@aws-cdk/core';
import { AttributeType, BillingMode, Table } from '@aws-cdk/aws-dynamodb';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { LambdaRestApi } from '@aws-cdk/aws-apigateway';
import { Duration } from '@aws-cdk/aws-cloudwatch/node_modules/@aws-cdk/core';

export class CdkDynamoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const partitionKey = { name: 'name', type: AttributeType.STRING };
    const table = new Table(this, 'MovieTable', {
      partitionKey: partitionKey,
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambda = new Function(this, 'MovieLambda', {
      code: Code.fromAsset('lambda'),
      handler: 'handler.handler',
      runtime: Runtime.NODEJS_14_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
        TABLE_PK: partitionKey.name,
      },
    });
    table.grantReadWriteData(lambda);

    const api = new LambdaRestApi(this, 'MovieAPI', { handler: lambda });

    new cdk.CfnOutput(this, 'MovieAdd', {
      value: `curl -X POST -H "Content-Type: application/json" -d '{"name": "test movie", "director": "Guga Zimmermann"}' ${api.url}`,
    });

    new cdk.CfnOutput(this, 'MovieReadOne', {
      value: `curl -X GET ${api.url}?movie=test%20movie`,
    });

    new cdk.CfnOutput(this, 'MovieReadAll', {
      value: `curl -X GET ${api.url}`,
    });

    new cdk.CfnOutput(this, 'MovieDelete', {
      value: `curl -X DELETE -H "Content-Type: application/json" -d '{"name": "test movie"}' ${api.url}`,
    });
  }
}
