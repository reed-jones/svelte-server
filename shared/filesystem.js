import memfs from 'memfs';
import { join } from 'path'

export const get = file => memfs.fs.readFileSync(join('/', file), 'utf8');
export const put = (file, contents) => memfs.fs.writeFileSync(join('/', file), contents)
