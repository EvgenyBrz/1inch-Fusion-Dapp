import process from 'process';
import * as dotenv from 'dotenv';


dotenv.config();

export default({
  server: {
    open: true,
  },
  define: {
    VITE_API_KEY: JSON.stringify(process.env.VITE_API_KEY),
    'process.env': {}, 
  },
  resolve: {
    alias: {
      assert: 'assert', // Polyfill for assert module
    },
  },
  tsconfig: './tsconfig.node.json'
});
