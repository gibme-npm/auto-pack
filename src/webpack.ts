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

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

interface ExtendedConfiguration extends Configuration {
    path: string;
    filename: string;
    type: string;
    enablePlugins: Partial<{
       bundleAnalyzer: boolean;
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
                assert: require.resolve('assert/'),
                buffer: require.resolve('buffer/'),
                console: require.resolve('console-browserify'),
                constants: require.resolve('constants-browserify'),
                crypto: require.resolve('crypto-browserify'),
                domain: require.resolve('domain-browser'),
                events: require.resolve('events/'),
                fs: false,
                http: require.resolve('stream-http'),
                https: require.resolve('https-browserify'),
                os: require.resolve('os-browserify/browser'),
                path: require.resolve('path-browserify'),
                punycode: require.resolve('punycode/'),
                process: require.resolve('process/browser'),
                querystring: require.resolve('querystring-es3'),
                stream: require.resolve('stream-browserify'),
                /* eslint-disable camelcase */
                _stream_duplex: require.resolve('readable-stream/lib/_stream_duplex'),
                _stream_passthrough: require.resolve('readable-stream/lib/_stream_passthrough'),
                _stream_readable: require.resolve('readable-stream/lib/_stream_readable'),
                _stream_transform: require.resolve('readable-stream/lib/_stream_transform'),
                _stream_writable: require.resolve('readable-stream/lib/_stream_writable'),
                string_decoder: require.resolve('string_decoder/'),
                /* eslint-enable camelcase */
                sys: require.resolve('util/'),
                timers: require.resolve('timers-browserify'),
                tty: require.resolve('tty-browserify'),
                url: require.resolve('url/'),
                util: require.resolve('util/'),
                vm: require.resolve('vm-browserify'),
                zlib: require.resolve('browserify-zlib')
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

    if (pkg.webpack?.enablePlugins?.bundleAnalyzer) {
        config.plugins.push(new BundleAnalyzerPlugin());
    }

    if (pkg.webpack?.exclude?.momentLocales) {
        config.plugins.push(new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en/));
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

        config.plugins.push(new webpack.ProvidePlugin({
            Buffer: [require.resolve('buffer/'), 'Buffer'],
            console: require.resolve('console-browserify'),
            process: require.resolve('process/browser')
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
