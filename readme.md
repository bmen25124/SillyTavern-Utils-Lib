Helper library for SillyTavern UI extensions.

[NPM Package](https://www.npmjs.com/package/sillytavern-utils-lib)
```sh
npm i sillytavern-utils-lib
```

Example imports:
```ts
import { buildPrompt } from 'sillytavern-utils-lib/prompt-builder';
import { st_echo, system_avatar, systemUserName } from 'sillytavern-utils-lib/config';
import { POPUP_RESULT } from 'sillytavern-utils-lib/types/popup';
import { EventNames } from 'sillytavern-utils-lib/types';
```

Publish:
```sh
npm version patch
npm install
npm publish
```