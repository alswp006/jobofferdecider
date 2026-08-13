import { type Foo } from './a';
import Foo from './b';
const f: Foo = { x: 1 };
console.log(f, Foo);
