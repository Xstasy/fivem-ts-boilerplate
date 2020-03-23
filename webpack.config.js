const nodeExternals = require('webpack-node-externals');
const webpack       = require('webpack');
const Rcon          = require('quake3-rcon');
const path          = require('path');
const fs            = require('fs');

const serverPath    = 'C:/FiveM/server';
const resourceName  = 'fivem-ts-boilerplate';

// RCON Connection for hot-reload
const rcon = new Rcon({
    address: '127.0.0.1',
    port: 30120,
    password: 'Covid-19'
});

let restarting = false;

// Define buildPath to server/resources/resourceName
const buildPath = path.resolve(`${serverPath}/resources/${resourceName}`);
const sourcePath = path.resolve(__dirname);

// Make sure our buildPath exists
if(!fs.existsSync(buildPath)) fs.mkdirSync(buildPath);

// Symlink fxmanifest.lua
if(!fs.existsSync(path.resolve(`${buildPath}/fxmanifest.lua`))) {
    fs.linkSync(path.resolve(`${sourcePath}/fxmanifest.lua`), path.resolve(`${buildPath}/fxmanifest.lua`), 'file');
}

// Symlink node_modules from sourcePath to buildPath
if(!fs.existsSync(path.resolve(`${buildPath}/node_modules`))) {
    fs.symlinkSync(path.resolve(`${sourcePath}/node_modules`), path.resolve(`${buildPath}/node_modules`), 'junction');
}

// Symlink third-party LUA libraries
if(!fs.existsSync(path.resolve(`${sourcePath}/third-party`))) fs.mkdirSync(path.resolve(`${sourcePath}/third-party`));
if(!fs.existsSync(path.resolve(`${buildPath}/third-party`))) {
    fs.symlinkSync(path.resolve(`${sourcePath}/third-party`), path.resolve(`${buildPath}/third-party`), 'junction');
}

// Symlink UI
if(!fs.existsSync(path.resolve(`${sourcePath}/ui`))) fs.mkdirSync(path.resolve(`${sourcePath}/ui`));
if(!fs.existsSync(path.resolve(`${buildPath}/ui`))) {
    fs.symlinkSync(path.resolve(`${sourcePath}/ui`), path.resolve(`${buildPath}/ui`), 'junction');
}

const restartPlugin = (name, source) => {
    if(!restarting) {
        
        restarting = true;

        rcon.send(`refresh`, (response) => {});
        rcon.send(`ensure ${name}`, (response) => {});

        console.log(`${source} triggered restart of ${name}, waiting 3 seconds before we allow next restart.`);

        // Wait 3 seconds before we trigger another restart.
        setTimeout(() => {
            restarting = false;
        }, 3000);
    }
};

const fivemResource = {
    name: 'FiveM',
    entry: {
        client: './src/client/client.ts',
        server: './src/server/server.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({ 'global.GENTLY': false }),
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('afterEmitPlugin', (compilation) => {
                    let output;
                    if(compilation.errors.length > 0) {
                        for(let i = 0; i < compilation.errors.length; i++) {
                            output += `${compilation.errors[i].message}\n`;
                        }
                        // Do something useful with error output here, i.e webhook discord or something.
                    }
                });

                compiler.hooks.done.tap('FiveM', (stats) => {
                    let lastChunkName = stats.compilation.chunks[stats.compilation.chunks.length-1].name;
                    restartPlugin(resourceName, lastChunkName);
                });
            }
        }
    ],
    stats: {
        errors: true,
        modules: false,
        warnings: true,
        hash: false,
        entrypoints: false,
        builtAt: false,
        chunks: false,
        timings: false,
        version: false,
        assets: true
    },
    externals: [nodeExternals()],
    optimization: {
        minimize: true
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: '[name].js',
        path: buildPath
    }
};

module.exports = [fivemResource];