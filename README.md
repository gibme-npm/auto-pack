# @gibme/auto-pack

A zero-config webpack CLI for bundling TypeScript and JavaScript projects for the web. Provides sensible defaults with full Node.js polyfills, TypeScript support, CSS loading, and optional plugins — all configurable via `package.json`, `webpack.config.js`, or `webpack.config.ts`.

## Requirements

- Node.js >= 22

## Installation

```bash
npm install -g @gibme/auto-pack
```

Or as a dev dependency:

```bash
yarn add --dev @gibme/auto-pack
```

## Quick Start

Run from your project root:

```bash
auto-pack
```

That's it. By default, auto-pack will:

- Bundle all configured entry points as production UMD bundles
- Output to `dist/[name].bundle.js` with source maps
- Resolve `.ts`, `.tsx`, and `.js` files via `ts-loader`
- Load `.css` files via `style-loader` and `css-loader`
- Provide Node.js polyfills for browser environments (assert, buffer, crypto, stream, etc.)
- Enable tree shaking and minification

## Configuration

Configuration is loaded and deep-merged in the following order (later sources override earlier ones):

1. **Built-in defaults** (see below)
2. **`webpack.config.js`** — standard webpack config file (if present)
3. **`webpack.config.ts`** — TypeScript webpack config file (if present)
4. **`package.json` `"webpack"` key** — inline configuration

### package.json Configuration

Add a `webpack` key to your `package.json`:

```json
{
  "webpack": {
    "entry": {
      "app": "./src/app.ts"
    },
    "path": "build",
    "filename": "[name].js",
    "type": "umd",
    "enablePlugins": {
      "bundleAnalyzer": true,
      "polyfills": true,
      "environment": {
        "API_URL": "https://api.example.com"
      },
      "dotenv": {
        "SECRET_KEY": ""
      }
    },
    "exclude": {
      "momentLocales": true,
      "globalJQuery": true
    }
  }
}
```

### Configuration Options

All standard [webpack configuration options](https://webpack.js.org/configuration/) are supported, plus the following extensions:

| Option | Type | Description |
|--------|------|-------------|
| `path` | `string` | Output directory (relative to cwd), defaults to `dist` |
| `filename` | `string` | Output filename pattern, defaults to `[name].bundle.js` |
| `type` | `string` | Library output type (e.g., `umd`, `commonjs2`, `window`) |
| `entry` | `{[name]: string}` | Entry point map (e.g., `{"main": "./src/index.ts"}`) |
| `enablePlugins` | `object` | Toggle built-in plugins (see below) |
| `exclude` | `object` | Exclusion hooks (see below) |

### Built-in Plugins

Configure via `enablePlugins`:

| Plugin | Type | Description |
|--------|------|-------------|
| `bundleAnalyzer` | `boolean` | Enables [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) for bundle size visualization |
| `polyfills` | `boolean` | Enables [node-polyfill-webpack-plugin](https://github.com/nicolo-ribaudo/node-polyfill-webpack-plugin) for additional Node.js polyfills |
| `environment` | `{[key]: value}` | Injects environment variables via `webpack.EnvironmentPlugin` with the specified defaults |
| `dotenv` | `{[key]: value}` | Loads `.env` file and injects specified variables via `webpack.EnvironmentPlugin` |

### Exclusion Hooks

Configure via `exclude`:

| Hook | Type | Description |
|------|------|-------------|
| `momentLocales` | `boolean` | Strips all moment.js locales except English |
| `globalJQuery` | `boolean` | Disables automatic jQuery detection and global exposure |

## jQuery Auto-Detection

If `jquery` is installed in your project's `node_modules`, auto-pack automatically:

- Registers jQuery as a global via `webpack.ProvidePlugin` (`$`, `jQuery`, `window.jQuery`)
- Exposes it via `expose-loader`

Set `exclude.globalJQuery: true` to disable this behavior.

## Default Webpack Configuration

```javascript
{
  mode: 'production',
  target: 'web',
  devtool: 'source-map',
  output: {
    path: '<cwd>/dist',
    filename: '[name].bundle.js',
    library: { type: 'umd' }
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // Full Node.js polyfill mappings for browser environments
      assert, buffer, console, constants, crypto, domain,
      events, http, https, os, path, punycode, process,
      querystring, stream, string_decoder, sys, timers,
      tty, url, util, vm, zlib
      // fs: false (not polyfilled)
    }
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }
    ]
  }
}
```

## License

MIT - See [LICENSE](https://github.com/gibme-npm/auto-pack/blob/master/LICENSE) for details.
