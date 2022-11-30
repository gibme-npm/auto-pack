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

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

interface Package {
    webpack?: {
        mode?: 'production' | 'development' | 'none';
        entry?: {
            [key: string]: string;
        },
        path?: string;
        filename?: string;
        type?: string;
    }
}

(async () => {
    const cwd = process.cwd();

    const webpackConfig = resolve(cwd, 'webpack.config.js');

    const pkgRequired = (name: string) =>
        existsSync(resolve(cwd, 'node_modules/', name));

    const pkgResolve = (name: string) => require.resolve(name, { paths: [cwd] });

    Logger.info('Webpack Starting in: %s', cwd);

    const pkg: Package = require(resolve(cwd, 'package.json'));

    const legacyConfig = existsSync(webpackConfig) ? require(webpackConfig) : undefined;

    if (legacyConfig) {
        Logger.warn('Using Legacy Config: %s', webpackConfig);
    }

    const defaultConfig: Configuration = {
        mode: pkg.webpack?.mode || 'production',
        devtool: 'source-map',
        entry: {},
        output: {
            path: resolve(cwd, pkg.webpack?.path || 'dist'),
            filename: pkg.webpack?.filename || '[name].bundle.js',
            library: {
                type: pkg.webpack?.type || 'umd'
            }
        },
        optimization: {
            usedExports: true,
            sideEffects: true
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                fs: false,
                path: false
            }
        },
        plugins: [
            new NodePolyfillPlugin()
        ],
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

    if (!legacyConfig && pkgRequired('jquery')) {
        const jquery = pkgResolve('jquery');

        Logger.info('jQuery detected: %s', jquery);

        config.plugins?.push(
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

    if (!legacyConfig) {
        config.entry = {};

        const entries = pkg.webpack?.entry || {};

        // loop through the entries
        for (const entry of Object.keys(entries)) {
            Logger.info('Entry found: %s => %s', entry, entries[entry]);
            Logger.info('             %s', resolve(cwd, entries[entry]));

            config.entry[entry] = resolve(cwd, entries[entry]);
        }
    } else {
        config.plugins?.push(new NodePolyfillPlugin());
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

    webpack(config, (error, stats) => {
        if (error) {
            Logger.error('%s', error.toString());
        }

        if (stats) {
            Logger.info('\n%s', stats.toString({ colors: true }));
        }
    });
})();
