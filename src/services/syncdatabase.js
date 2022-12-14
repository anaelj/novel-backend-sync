import ServerController from "./../controllers/servers.controller";
import DatabasesController from "./../controllers/databases.controller";
import LogController from "./../controllers/logs.controller";
import { executeSqlLocal } from "./../services/sql.local";
import { executeSqlCustomer } from "./../services/sql.customer";

// todo - ficou definido que nesta primeira verão teremos apenas uma consulta sql, de viagens, poderiormente teremos um cadastro de sql
const sqls = [
  {
    sql: `select count(*) from conhecimento where conhecimento.datadigitacao BETWEEN CURRENT_DATE - '30 days'::interval AND CURRENT_DATE`,
    fieldName: "count",
  },
  {
    sql: `select now() as dataAtual`,
    fieldName: "dataatual",
  },
  {
    sql: `SELECT max(conhecimento.numero) FROM conhecimento where conhecimento.data > CURRENT_DATE - '1 days'::interval`,
    fieldName: "max",
  },
  {
    sql: `SELECT max(nota.codnota) FROM nota where nota.datadigitacao > CURRENT_DATE - '1 days'::interval`,
    fieldName: "max",
  },
];

export const syncAllDatabase = async (recursive) => {
  const servers = await ServerController.getAllServers();
  const databases = await DatabasesController.getAllDataBases();

  console.log("servers:", servers.length);
  console.log("databases:", databases.length);

  servers
    .sort((a, b) => a.name - b.name)
    //  .filter((server) => server.id === 11)
    .forEach((server) => {
      console.log("  ", server.name, "");
      databases
        // .filter((database) => database.id === 51)
        .filter((database) => database.id_server === server.id)
        .forEach(async (database) => {
          console.log("   - ", database.name_client);
          try {
            let status_connection = 200;
            let logDescription = {};

            const {
              value: valueSql0,
              status: statusSql0,
              errorMessage: errorMessageLocal,
            } = await executeSqlLocal(server, database, sqls[0]);

            const { value: valueSql1 } = await executeSqlLocal(
              server,
              database,
              sqls[1]
            );
            const { value: valueSqlMaxCteToDay } = await executeSqlLocal(
              server,
              database,
              sqls[2]
            );

            const { value: valueSqlMaxInvoiceToDay } = await executeSqlLocal(
              server,
              database,
              sqls[3]
            );

            // console.log("valueSqlMaxCteToDay", valueSqlMaxCteToDay);

            logDescription = {
              ...logDescription,
              travelsLocal: valueSql0,
              currentDateLocal: valueSql1,
              max_invoice_today: valueSqlMaxInvoiceToDay,
              max_cte_today: valueSqlMaxCteToDay,
              errorMessageLocal,
            };

            // console.log("logDescription", logDescription);

            if (status_connection != 500) status_connection = statusSql0;

            const {
              value: valueCustomerSql0,
              status: statusCustomer,
              errorMessage: errorMessageCustomer,
            } = await executeSqlCustomer(database, sqls[0]);

            const { value: valueCustomerSql1 } = await executeSqlCustomer(
              database,
              sqls[1]
            );

            logDescription = {
              ...logDescription,
              travelsCustomer: valueCustomerSql0,
              currentDateCustomer: valueCustomerSql1,
              errorMessageCustomer,
            };

            if (status_connection != 500) status_connection = statusCustomer;

            const logData = {
              description: JSON.stringify(logDescription),
              id_database: database.id,
              status_connection,
            };

            await LogController.createLog(logData);

            console.log(
              "SINCRONIZANDO...",
              new Date().toLocaleString("pt-BR"),
              database.description
            );

            return logData;
          } catch (error) {
            const logData = {
              description: JSON.stringify({
                ...logDescription,
              }),
              globalErrorMessage: error?.message,
              id_database: database.id,
              status_connection: 500,
            };
            await LogController.createLog(logData);
            return logData;
          }
        });
    });

  if (recursive) {
    setTimeout(async () => {
      await syncAllDatabase(true);
    }, 60000 * 20);
  }
};
