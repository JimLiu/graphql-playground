import * as path from 'path'
import * as fs from 'fs'
import {
  getUsedEnvs,
  getGraphQLConfig,
  findGraphQLConfigFile,
} from 'graphql-config'

import getLoadingMarkup from './get-loading-markup'

export interface MiddlewareOptions {
  endpoint: string
  subscriptionEndpoint?: string
  setTitle?: string
  folderName?: string
}

export interface RenderPageOptions extends MiddlewareOptions {
  version: string
  env?: any
}

const loading = getLoadingMarkup()

export function renderPlaygroundPage(options: RenderPageOptions) {
  let config
  let configPath
  let configString
  let folderName
  let env
  try {
    config = getGraphQLConfig().config
    configPath = findGraphQLConfigFile(process.cwd())
    configString = fs.readFileSync(configPath, 'utf-8')
    folderName = path.basename(process.cwd())
    env = getUsedEnvs(config)
  } catch (e) {
    //
  }
  const extendedOptions = {
    ...options,
    configString,
    folderName,
    canSaveConfig: false,
    env,
  }
  if (!extendedOptions.endpoint && !extendedOptions.configString) {
    /* tslint:disable-next-line */
    console.warn(
      `WARNING: You didn't provide an endpoint and don't have a .graphqlconfig. Make sure you have at least one of them.`,
    )
  }
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset=utf-8 />
    <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, minimal-ui">
    <title>GraphQL Playground</title>
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground@${
      options.version
    }/build/static/css/index.css" />
    <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground@${
      options.version
    }/build/favicon.png" />
    <script src="//cdn.jsdelivr.net/npm/graphql-playground@${
      options.version
    }/build/static/js/middleware.js"></script>
  </head>
  <body>
    <style type="text/css">
      html {
        font-family: "Open Sans", sans-serif;
        overflow: hidden;
      }
  
      body {
        margin: 0;
        background: #172a3a;
      }
  
      .playgroundIn {
        -webkit-animation: playgroundIn 0.5s ease-out forwards;
        animation: playgroundIn 0.5s ease-out forwards;
      }
  
      @-webkit-keyframes playgroundIn {
        from {
          opacity: 0;
          -webkit-transform: translateY(10px);
          -ms-transform: translateY(10px);
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          -webkit-transform: translateY(0);
          -ms-transform: translateY(0);
          transform: translateY(0);
        }
      }
  
      @keyframes playgroundIn {
        from {
          opacity: 0;
          -webkit-transform: translateY(10px);
          -ms-transform: translateY(10px);
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          -webkit-transform: translateY(0);
          -ms-transform: translateY(0);
          transform: translateY(0);
        }
      }
    </style>
    ${loading.container}
    <div id="root" />
    <script type="text/javascript">
      window.addEventListener('load', function (event) {
        ${loading.script}
  
        const root = document.getElementById('root');
        root.classList.add('playgroundIn');
  
        GraphQLPlayground.init(root, ${JSON.stringify(
          extendedOptions,
          null,
          2,
        )})
      })
    </script>
  </body>
  </html>
`
}
