require("dotenv").config();

const base = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || null,
  database: process.env.DB_NAME || "database_development",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  dialect: "mysql",
  logging: false,
};

module.exports = {
  development: { ...base },
  test: { ...base, database: process.env.DB_NAME || "database_test" },
  production: { ...base },
};
