import bootstrap from "./app.bootstrap";
import {resolve} from "node:path";

console.log(resolve( ));

bootstrap();


// We write module code but it will be converted to commonjs by tsc, so we can use import and export syntax in our code. 
// The main entry point of the application is src/main.ts, which imports the bootstrap function from src/app.bootstrap.ts and calls it to start the application. 
// The tsconfig.json file is configured to target ES2023 and use the NodeNext module system, which allows us to use modern JavaScript features while still being compatible with Node.js.