import process from 'process';
import * as dotenv from 'dotenv';


dotenv.config();

export default({
  server: {
    open: true,
  },
  define: {
    VITE_API_KEY: JSON.stringify(process.env.VITE_API_KEY),
    VITE_API_BASE_URL: JSON.stringify(process.env.VITE_API_BASE_URL),
    'process.env': {},
  },
  resolve: {
    alias: {
      assert: 'assert', // Polyfill for assert module
    },
  },
  tsconfig: './tsconfig.node.json'
});
