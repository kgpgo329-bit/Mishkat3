import dotenv from 'dotenv';
dotenv.config();
import { config } from '../src/server/config/config.js';

console.log('config.gemini.model:', config.gemini.model);
console.log('process.env.GEMINI_MODEL:', process.env.GEMINI_MODEL);
