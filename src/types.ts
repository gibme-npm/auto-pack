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

import { Configuration as WebpackConfiguration } from 'webpack';
import { resolve } from 'path';

export interface KnownPlugins {
    bundleAnalyzer: boolean;
    polyfills: boolean;
    environment: {[key: string]: any};
    dotenv: {[key: string]: any};
}

export interface ExcludeHooks {
    momentLocales: boolean;
}

export interface Configuration extends WebpackConfiguration {
    path: string;
    filename: string;
    type: string;
    enablePlugins: Partial<KnownPlugins>;
    exclude: Partial<ExcludeHooks>;
    entry: { [key: string]: string };
}

export interface PackageConfig {
    webpack?: Partial<Configuration>;
}

export const defaultConfig: Partial<Configuration> = {
    mode: 'production',
    devtool: 'source-map',
    output: {
        path: resolve(process.cwd(), 'dist'),
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
    enablePlugins: {},
    module: {
        rules: [
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }
        ]
    },
    target: 'web'
};
