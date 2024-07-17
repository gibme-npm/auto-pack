// Copyright (c) 2022-2024, Brandon Lehmann <brandonlehmann@gmail.com>
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

import webpack from 'webpack';
import { resolve } from 'path';
import Logger from '@gibme/logger';
import { Configuration } from './types';
import { inspect } from 'util';
import pkg from './pkg';
import deepmerge from 'deepmerge';
import { config as dotenv } from 'dotenv';

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const NodePolyfillsPlugin = require('node-polyfill-webpack-plugin');
const DynamicCDNPlugin = require('dynamic-cdn-webpack-plugin');

(async () => {
    const cwd = process.cwd();

    Logger.info('Webpack Starting in: %s', cwd);

    const default_config = pkg.default_config();

    const legacy_config = pkg.legacy_config();

    const legacy_config_typescript = pkg.legacy_config_typescript();

    const package_config = pkg.package_config();

    const config = (() => {
        let temp = default_config;

        if (legacy_config) {
            Logger.warn('Merging configuration from webpack.config.js');

            temp = deepmerge(temp, legacy_config as Configuration);
        }

        if (legacy_config_typescript) {
            Logger.warn('Merging configuration from webpack.config.ts');

            temp = deepmerge(temp, legacy_config_typescript as Configuration);
        }

        if (package_config) {
            Logger.warn('Merging configuration from package.json');

            temp = deepmerge(temp, package_config);
        }

        temp.enablePlugins ??= {};
        temp.plugins ??= [];

        return temp;
    })();

    if (config.enablePlugins?.bundleAnalyzer) {
        config.plugins?.push(new BundleAnalyzerPlugin());
    }

    if (config.enablePlugins?.polyfills) {
        config.plugins?.push(new NodePolyfillsPlugin());
    }

    if (config.enablePlugins?.dynamicCdn) {
        config.plugins?.push(new DynamicCDNPlugin());
    }

    if (config.enablePlugins?.environment) {
        config.plugins?.push(new webpack.EnvironmentPlugin(config.enablePlugins.environment));
    }

    if (config.enablePlugins?.dotenv) {
        dotenv();
        config.plugins?.push(new webpack.EnvironmentPlugin(config.enablePlugins.dotenv));
    }

    if (config.exclude?.momentLocales) {
        config.plugins?.push(new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en/));
    }

    if (config.output) {
        if (config.path) config.output.path = resolve(process.cwd(), config.path);
        if (config.filename) config.output.filename = config.filename;
        if (config.type) config.output.library = { type: config.type };
    }

    if (pkg.required('jquery')) {
        const jquery = pkg.resolve('jquery');

        Logger.info('jQuery detected: %s', jquery);

        config.plugins?.push(new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery'
        }));

        Logger.info('jQuery plugin loaded');

        config.module?.rules?.push({
            test: jquery,
            loader: 'expose-loader',
            options: { exposes: ['$', 'jQuery'] }
        });

        Logger.info('jQuery exposed as $ and jQuery');
    }

    // plugins that we highly recommend
    {
        let last = 0;
        config.plugins?.push(new webpack.ProgressPlugin((percentage, msg, ...args) => {
            const pct = parseInt((percentage * 100).toFixed(0));
            if (pct !== last) {
                Logger.info('%s% complete: %s %s', pct, msg, args.join(' '));
                last = pct;
            }
        }));
    }

    // loop through our entries and resolve the paths
    for (const key of Object.keys(config.entry ?? {})) {
        if (!config.entry) continue;

        const path = resolve(cwd, config.entry[key]);

        Logger.info('Entry found: %s => %s', key, config.entry[key]);
        Logger.info('             %s', path);

        if (config.entry) config.entry[key] = path;
    }

    Logger.warn('%s entry point(s) detected', Object.keys(config.entry ?? {}).length);
    Logger.info('');
    Logger.info('Full Configuration');
    Logger.debug(inspect(config, { depth: 100 }));

    delete config.path;
    delete config.filename;
    delete config.type;
    delete config.enablePlugins;
    delete config.exclude;

    webpack(config, (error, stats) => {
        if (error) {
            Logger.error('\n%s', error.toString());
        }

        if (stats) {
            Logger.info('\n%s', stats.toString({ colors: true }));
        }
    });
})();
