import type { Plugin } from 'vite'
import { createNotesHandler, type NotesHandlerOptions } from './handler.ts'

export function ruecaNotes(opts: Omit<NotesHandlerOptions, 'root'> = {}): Plugin {
  return {
    name: 'rueca-notes',
    apply: 'serve',
    configureServer(server) {
      const hosts = server.config.server.allowedHosts
      const handle = createNotesHandler({ root: server.config.root, allowedHosts: hosts === true ? true : Array.isArray(hosts) ? hosts : undefined, ...opts })
      server.middlewares.use((req, res, next) => {
        handle(req, res).then((done) => { if (!done) next() }, next)
      })
    },
  }
}
