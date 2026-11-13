import {prepare} from './pr39-fixture';
prepare().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
