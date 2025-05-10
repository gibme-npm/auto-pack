// Copyright (c) 2022-2025, Brandon Lehmann <brandonlehmann@gmail.com>
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

import { existsSync } from 'fs';
import { resolve } from 'path';
import { Configuration as WebpackConfiguration } from 'webpack';
import { Configuration, defaultConfig, PackageConfig } from './types';

export default abstract class pkg {
    public static required (name: string): boolean {
        return existsSync(resolve(process.cwd(), 'node_modules/', name));
    }

    public static resolve (name: string): string {
        return require.resolve(name, { paths: [process.cwd()] });
    }

    public static legacy_config (): Partial<WebpackConfiguration> | undefined {
        const path = resolve(process.cwd(), 'webpack.config.js');

        if (existsSync(path)) {
            return require(path);
        }
    }

    public static legacy_config_typescript (): Partial<WebpackConfiguration> | undefined {
        const path = resolve(process.cwd(), 'webpack.config.ts');

        if (existsSync(path)) {
            return require(path).default;
        }
    }

    public static package_config (): Partial<Configuration> | undefined {
        const config: PackageConfig = require(resolve(process.cwd(), 'package.json'));

        return config.webpack;
    }

    public static default_config (): Partial<Configuration> {
        return defaultConfig;
    }
}
