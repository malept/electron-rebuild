import { SpawnOptions } from 'child_process';
import { spawn } from 'cross-spawn';
import * as debug from 'debug';

const d = debug('electron-rebuild:spawn');

export type SpawnArguments = {
  command: string;
  args: ReadonlyArray<string>;
  options: SpawnOptions;
};

export class SpawnError extends Error {
  public spawnArguments: SpawnArguments;
  public stdout?: string;
  public stderr?: string;
  public wrappedError?: Error;

  constructor(spawnArguments: SpawnArguments, stdout?: string, stderr?: string, error?: Error, code?: number) {
    let message = '';
    if (error) {
      message = `Error executing command "${spawnArguments.command} ${spawnArguments.args.join(' ')}" (${error.message}):
${stdout}
${stderr}`.trim();
    } else if (code) {
      message = `Command failed with a non-zero return code (${code}):
${spawnArguments.command} ${spawnArguments.args.join(' ')}
${stdout}
${stderr}`.trim();
    }
    super(message);
    this.spawnArguments = spawnArguments;
    this.stdout = stdout;
    this.stderr = stderr;
    this.wrappedError = error;
  }
}

export async function spawnPromise(command: string, args: ReadonlyArray<string>, options: SpawnOptions): Promise<string> {
  d(`Executing command ${command} ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const process = spawn(command, args, options);
    if (process.stdout) {
      process.stdout.on('data', data => {
        stdout += data.toString();
      });
    }
    if (process.stderr) {
      process.stderr.on('data', data => {
        /* istanbul ignore next */
        stderr += data.toString();
      });
    }
    process.on('close', code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new SpawnError({ command, args, options }, stdout, stderr, undefined, code));
      }
    });
    process.on('error', err => {
      reject(new Error(`Error executing command (${err.message || err}):\n${command} ${args.join(' ')}\n${stderr}`));
      reject(new SpawnError({ command, args, options }, stdout, stderr, err));
    });
  });
}
