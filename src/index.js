import "dotenv/config";
import express from "express";
import ServerController from "./controllers/servers.controller";
import DatabasesController from "./controllers/databases.controller";
import syncDatabase from "./database/syncSchema";
import { QueryTypes } from "sequelize";

const { PORT, HOST } = process.env;

const servers = await ServerController.getAllServers();
const databases = await DatabasesController.getAllDataBases();

const sql1 = `select count(*) from conhecimento where conhecimento.datadigitacao BETWEEN CURRENT_DATE - '30 days'::interval AND CURRENT_DATE`;

servers.forEach(async (server) => {
  databases
    .filter((database) => database.id_server === server.id)
    .forEach(async (database) => {
      try {
        const model_main = syncDatabase(
          database.name_default,
          database.user_default,
          database.password_default,
          server.url,
          "postgres",
          server.port,
          false
        );
        const sql1Main = await model_main.query(sql1, {
          type: QueryTypes.SELECT,
        });

        const model_customer = syncDatabase(
          database.name_client,
          database.user_client,
          database.password_client,
          database.hostname_client,
          "postgres",
          server.port,
          false
        );

        const sql1Customer = await model_customer.query(sql1, {
          type: QueryTypes.SELECT,
        });

        console.log(sql1Customer);

        console.log(sql1Main);
        sql1Customer.close();
        sql1Main.close();
      } catch (error) {
        console.log(
          `database:::${server.url}/${database.name_default}::error: ${error}`
        );
      }
      // console.log(server.id, database.id, database.description);
    });
});

const app = express();

app.listen(PORT, () => {
  console.log(`O servidor está online: [${HOST}:${PORT}]`);
});
