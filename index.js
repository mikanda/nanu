/*jslint nomen: true, node: true, devel: true, maxlen: 79 */
'use strict';
var _request = require('request'),
    Nanu,
    DesignDoc;
exports._request = _request;
_request = module.exports._request;
function request(options, callback) {
  var __request = _request;
  if (options._request) {
    __request = options._request;
    delete options._request;
  }
  if (callback) {
    return __request(options, function (error, res) {
      var e;
      if (error) {
        callback(error, res);
      } else {
        if (typeof res.body === 'string') {
          res.body = JSON.parse(res.body);
        }
        if (
          res.statusCode >= 200
            && res.statusCode <= 202
        ) {
          callback(null, res.body);
        } else {
          e = new Error(res.body.error + ': '
                  + res.body.reason);
          e.error = res.body.error;
          e.reason = res.body.reason;
          e.statusCode = res.statusCode;
          callback(e, res);
        }
      }
    });
  } else {
    return __request(options);
  }
}
function Nanu(database, host) {
  var that = this,
    proto = '__proto__',
    key;
  this._host = host || 'http://localhost:5984';
  this._database = database;
};
function Doc(parent, doc) {
  this._parent = parent;
  this._doc = doc;
}
function DesignDoc(parent, designdoc) {
  this._parent = parent;
  this._design = designdoc;
}
Nanu.prototype._buildUrl = function (args) {
  var url;
  url = [this._host, this._database].concat(args);
  return url.join('/');
};
Nanu.prototype.doc = function (doc) {
  return new Doc(this, doc);
};
Nanu.prototype.design = function (designName) {
  var d = new DesignDoc(this, designName);

  /* To create a scoped design-document we slurp all the design doc prototype
   * properties into the given design doc object. */

  return d;
};
Nanu.prototype.get = function (id, options, callback) {
  options = options || {};
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options.url = options.uri = this._host + '/' + this._database
    + '/' + id;
  return request(options, callback);
};
Nanu.prototype.insert = function (doc, options, callback) {
  options = options || {};
  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else if (options === undefined) {
    options = {};
  }
  options.json = true;
  options.body = doc;
  options.url = this._host + '/' + this._database;
  if (doc._id) {
    options.url += '/' + doc._id;
    options.method = 'PUT';
  } else {
    options.method = 'POST';
  }
  return request(options, callback);
};
Nanu.prototype.bulk = function (options, callback) {
  var host = this._host,
    database = this._database,
    url = null;
  options = options || {};
  options.url = options.uri = url;
  options.json = true;
  options.body = options.body || {};
  options.method = 'POST';
  if (options.docs) {
    options.body.docs = options.docs;
    delete options.docs;
  } else if (options.keys) {
    url = [host, database, '_all_docs'].join('/');
    options.body.keys = options.keys;
    delete options.keys;
  }
  if (options.include_docs) {
    options.qs = options.qs || {};
    options.qs.include_docs = options.include_docs;
    delete options.include_docs;
  }
  if (!url) {
    url = [host, database, '_bulk_docs'].join('/');
  }
  options.url = options.uri = url;
  return request(options, callback);
};
Doc.prototype._buildUrl = function () {
  var args,
      i;
  args = [this._doc];
  for (i = 0; i < arguments.length; ++i) {
    args.push(arguments[i]);
  }
  return this._parent._buildUrl.call(this._parent, args);
};

/**
 * Appends an attachment to the document.
 *
 * @param {String} name
 * @param {Object} [options]
 * @param {Function} [callback]
 */

Doc.prototype.insert = function (name, options, callback) {
  var url;
  options = options || {};
  if (options.rev) {
    options.qs = options.qs || {};
    options.qs.rev = options.rev;
    delete options.rev;
  }
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options.method = 'PUT';
  if (options.contentType) {
    options.headers = options.headers || {};
    options.headers['Content-Type'] = options.contentType;
    delete options.contentType;
  }
  if (options.batch) {
    options.qs = options.qs || {};
    options.qs.batch = 'ok';
    delete options.batch;
  }
  url = this._buildUrl(name);
  options.uri = options.url = url;
  return request(options, callback);
};

/** Executes the given view and returns the result. */

DesignDoc.prototype.view = function (view, options, callback) {
  var host = this._parent._host,
    database = this._parent._database,
    key;
  options = options || {};
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (options.key) {
    options.method = 'GET';
    options.qs = options.qs || {};
    options.qs.key = JSON.stringify(options.key);
    delete options.key;
  } else if (options.keys) {
    options.method = 'POST';
    options.json = true;
    options.body = options.body || {};
    options.body.keys = options.keys;
    delete options.keys;
  }
  [
    'startkey',
    'endkey',
    'limit',
    'reduce',
    'group',
    'include_docs'
  ].forEach(
    function (k) {
      if (options.hasOwnProperty(k)) {
        options.method = 'GET';
        options.qs = options.qs || {};
        options.qs[k] = JSON.stringify(options[k]);
        delete options[k];
      }
    }
  );
  options.url = options.uri = host + '/' + database
    + '/_design/' + this._design + '/_view/' + view;
  return request(options, callback);
};
DesignDoc.prototype.update = function (handler, options, id, callback) {

  /* The options and the id parameter are optional so we have to figure out
   * if and at which position a callback was given. */

  var host = this._parent.host,
    database = this._parent.database;
  options = options || {};
  if (typeof options === 'string') {
    id = options;
    options = {};
  } else if (typeof options === 'function') {
    callback = options;
  }
  if (typeof id === 'function') {
    callback = id;
    id = undefined;
  }
  var url = host + '/' + database
      + '/_design/' + this._design + '/_update/' + handler;

  /* Then we construct the url and the request method dependent on the fact
   * that an id was given or not. */

  if (id) {
    url += '/' + id;
    options.method = 'PUT';
  } else {
    options.method = 'POST';
  }
  options.url = options.uri = url;
  return request(options, callback);
};
exports.Nanu = Nanu;
exports.DesignDoc = DesignDoc;
