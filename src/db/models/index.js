import { database as sequelize } from '../../config/index.js';
import User from './User.js';
import Group from './Group.js';
import InvitedGuest from './InvitedGuest.js';
import Message from './Message.js';

// Importar y ejecutar las asociaciones
import './associations.js';

export { sequelize, User, Group, InvitedGuest, Message }; 