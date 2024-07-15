// Copyright (c) 2022, Brandon Lehmann <brandonlehmann@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import webpack, { Configuration } from 'webpack';
import { existsSync } from 'fs';
import { resolve } from 'path';
import Logger from '@gibme/logger';
import { inspect } from 'util';

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const fallbacks = new Map<string, string>([
    ['assert', 'assert'],
    ['buffer', 'buffer'],
    ['console', 'console-browserify'],
    ['constants', 'constants-browserify'],
    ['crypto', 'crypto-browserify'],
    ['domain', 'domain-browser'],
    ['events', 'events'],
    ['http', 'stream-http'],
    ['https', 'https-browserify'],
    ['os', 'os-browserify/browser'],
    ['path', 'path-browserify'],
    ['punycode', 'punycode'],
    ['process', 'process/browser'],
    ['querystring', 'querystring-es3'],
    ['stream', 'stream-browserify'],
    ['string_decoder', 'string_decoder'],
    ['sys', 'util'],
    ['timers', 'timers-browserify'],
    ['tty', 'tty-browserify'],
    ['url', 'url'],
    ['util', 'util'],
    ['vm', 'vm-browserify'],
    ['zlib', 'browserify-zlib']
]);

interface Fallbacks {
    assert: boolean;
    buffer: boolean;
    console: boolean;
    constants: boolean;
    crypto: boolean;
    domain: boolean;
    events: boolean;
    fs: boolean;
    http: boolean;
    https: boolean;
    os: boolean;
    path: boolean;
    punycode: boolean;
    process: boolean;
    querystring: boolean;
    stream: boolean;
    string_decoder: boolean;
    sys: boolean;
    timers: boolean;
    tty: boolean;
    url: boolean;
    util: boolean;
    vm: boolean;
    zlib: boolean;

    [key: string]: boolean;
}

interface ExtendedConfiguration extends Configuration {
    path: string;
    filename: string;
    type: string;
    enableFallbacks: Partial<Fallbacks>;
    enablePlugins: Partial<{
       bundleAnalyzer: boolean;
       polyfills: boolean;
    }>;
    exclude: Partial<{
        momentLocales: boolean;
    }>;
    entry: {[key: string]: string;}
}

interface Package {
    webpack?: Partial<ExtendedConfiguration>;
}

(async () => {
    const cwd = process.cwd();

    const webpackConfig = resolve(cwd, 'webpack.config.js');

    const pkgRequired = (name: string) =>
        existsSync(resolve(cwd, 'node_modules/', name));

    const pkgResolve = (name: string) => require.resolve(name, { paths: [cwd] });

    Logger.info('Webpack Starting in: %s', cwd);

    const pkg: Package = require(resolve(cwd, 'package.json'));

    if (pkg.webpack) {
        Logger.warn('Including Package.json config');
    }

    const legacyConfig = existsSync(webpackConfig) ? require(webpackConfig) : undefined;

    if (legacyConfig) {
        Logger.warn('Using Legacy Config: %s', webpackConfig);
    }

    const defaultConfig: Configuration = {
        mode: pkg.webpack?.mode || 'production',
        devtool: pkg.webpack?.devtool || 'source-map',
        entry: {},
        output: {
            path: resolve(cwd, pkg.webpack?.path || 'dist'),
            filename: pkg.webpack?.filename || '[name].bundle.js',
            library: {
                type: pkg.webpack?.type || 'umd'
            }
        },
        optimization: {
            minimize: true,
            usedExports: true,
            sideEffects: true
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                assert: false,
                buffer: false,
                console: false,
                constants: false,
                crypto: false,
                domain: false,
                events: false,
                fs: false,
                http: false,
                https: false,
                os: false,
                path: false,
                punycode: false,
                process: false,
                querystring: false,
                stream: false,
                string_decoder: false,
                sys: false,
                timers: false,
                tty: false,
                url: false,
                util: false,
                vm: false,
                zlib: false
            }
        },
        plugins: [],
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        },
        target: 'web'
    };

    const config: Configuration = legacyConfig || defaultConfig;

    config.plugins ??= [];

    if (pkg.webpack?.enablePlugins?.polyfills) {
        config.plugins.push(new NodePolyfillPlugin());
    }

    if (pkg.webpack?.enablePlugins?.bundleAnalyzer) {
        config.plugins.push(new BundleAnalyzerPlugin());
    }

    if (pkg.webpack?.exclude?.momentLocales) {
        config.plugins.push(new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en/));
    }

    if (pkg.webpack?.enableFallbacks) {
        for (const key of Object.keys(pkg.webpack?.enableFallbacks)) {
            if (!config.resolve) config.resolve = {};
            if (!config.resolve.fallback) config.resolve.fallback = {};

            const module = fallbacks.get(key);

            if (module) {
                (config.resolve.fallback as any)[key] = require.resolve(module);
            } else {
                (config.resolve.fallback as any)[key] = false;
            }
        }
    }

    if (!legacyConfig && pkgRequired('jquery')) {
        const jquery = pkgResolve('jquery');

        Logger.info('jQuery detected: %s', jquery);

        config.plugins.push(
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                'window.jQuery': 'jquery'
            })
        );

        Logger.info('jQuery plugin loaded!');

        config.module?.rules?.push({
            test: jquery,
            loader: 'expose-loader',
            options: {
                exposes: ['$', 'jQuery']
            }
        });

        Logger.info('jQuery exposed!');
    }

    { // these are plugins that we **highly** recommend
        let last = 0;
        config.plugins.push(new webpack.ProgressPlugin((percentage, msg, ...args) => {
            const pct = parseInt((percentage * 100).toFixed(0));
            if (pct !== last) {
                Logger.info('%s% complete: %s %s', pct, msg, args.join(' '));
                last = pct;
            }
        }));
    }

    if (!legacyConfig) {
        config.entry = {};

        const entries = pkg.webpack?.entry || {};

        // loop through the entries
        for (const entry of Object.keys(entries)) {
            Logger.info('Entry found: %s => %s', entry, entries[entry]);
            Logger.info('             %s', resolve(cwd, entries[entry]));

            config.entry[entry] = resolve(cwd, entries[entry]);
        }
    }

    let entries = 0;

    if (typeof config.entry === 'string') {
        Logger.info('Entry found: main => %s', config.entry);
        entries++;
    } else if (Array.isArray(config.entry)) {
        for (const entry of config.entry) {
            Logger.info('Entry found %s', entry);
            entries++;
        }
    } else if (typeof config.entry === 'object') {
        for (const entry of Object.keys(config.entry)) {
            Logger.info('Entry found: %s => %s', entry, config.entry[entry]);
            entries++;
        }
    }

    Logger.warn('%s entry point(s) detected', entries);

    Logger.info('');

    Logger.info('Full Configuration');
    console.log(inspect(config, { depth: 100 }));

    webpack(config, (error, stats) => {
        if (error) {
            Logger.error('%s', error.toString());
        }

        if (stats) {
            Logger.info('\n%s', stats.toString({ colors: true }));
        }
    });
})();
