-- Desactivar las restricciones de clave foránea temporalmente
SET session_replication_role = 'replica';

-- Borrar todas las tablas en orden (de más dependiente a menos dependiente)
DROP TABLE IF EXISTS invited_guests CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS "SequelizeMeta" CASCADE;

-- Reactivar las restricciones de clave foránea
SET session_replication_role = 'origin'; 