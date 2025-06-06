import client from "../src/config/database";

const testConnection = async () => {
  try {
    const result = await client.query("SELECT NOW()");
    console.log("Conexión exitosa. Hora del servidor:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Error en la conexión o consulta:", error);
  } finally {
    await client.end();
  }
};

testConnection();