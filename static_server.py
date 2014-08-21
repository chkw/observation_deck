import tornado.ioloop
import tornado.web
import tornado.httpserver
import sys

if __name__ == "__main__":
	path = sys.argv[1]
	port = sys.argv[2]
	
	application = tornado.web.Application([(r"/(.*)", tornado.web.StaticFileHandler, {"path": path}), ])
	http_server = tornado.httpserver.HTTPServer(application)
	http_server.listen(port)
	tornado.ioloop.IOLoop.instance().start()
