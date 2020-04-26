const path = require('path');
const fs = require('fs');
const express = require('express');
const expressBasicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const { Contact, ScanStatus, Wechaty, log } = require('wechaty');
const messageHandler = require('../runtime/message-handler');

// setting

let setting = null;
try {
  setting = JSON.parse(fs.readFileSync(`${__dirname}${path.sep}..${path.sep}runtime${path.sep}setting.json`));
} catch (error) {
  setting = { token: 'SoZfHK9U5WWbruNMWw5v' };
}

// express configure

let user = null;

const launchHttpServer = () => {
  const app = express();
  // basic authentication
  const auth = expressBasicAuth({
    users: { '': setting.token },
    challenge: true
  });
  // GET - /
  app.get('/', auth, (req, res) => {
    log.info('express::get', 'received - %s', req.ip);
    // error handler
    const errorHandler = (error) => {
      res.set('Content-Type', 'text/html; charset=UTF-8');
      res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>WeChat</title></head><body><h1>WeChat assistant is running.</h1></body></html>');
      log.warn('express::get', 'sent - %s', error.toString());
    };
    // [1] friend list
    robot.Contact.findAll().then((contactList) => {
      let friendList = [];
      for (let i = 0; i < contactList.length; i++) {
        if (contactList[i].type() === Contact.Type.Personal) {
          friendList.push(contactList[i]);
        }
      }
      // [2] alias list of friend list
      Promise.all(friendList.map((friend) => {
        return friend.alias();
      })).then((aliasList) => {
        let friendText = '<tr><th><font color="blue">Name</font></th><th><font color="blue">Alias</font></th></tr>';
        let isUser = false;
        for (let i = 0; i < friendList.length; i++) {
          isUser = (user.name() == friendList[i].name());
          friendText += `<tr><th>${isUser ? '<font color="red">' : ''}${friendList[i].name()}${isUser ? '</font>' : ''}</th><th>${isUser ? '<font color="red">' : ''}${aliasList[i] ? aliasList[i] : '<null>'}${isUser ? '</font>' : ''}</th></tr>`;
        }
        // [3] room list
        robot.Room.findAll().then((roomList) => {
          // [4] topic list of room list
          Promise.all(roomList.map((room) => {
            return room.topic();
          })).then((topicList) => {
            let roomText = '<tr><th><font color="blue">Topic</font></th></tr>';
            for (let i = 0; i < roomList.length; i++) {
              roomText += `<tr><th>${topicList[i] ? topicList[i] : '<null>'}</th></tr>`;
            }
            const content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WeChat</title></head><body><h1>WeChat assistant is running.</h1><h2>Friend List</h2><table border="1">${friendText}</table><h2>Group List</h2><table border="1">${roomText}</table></body></html>`;
            res.set('Content-Type', 'text/html; charset=UTF-8');
            res.send(content);
            log.info('express::get', 'sent');
          }).catch(errorHandler);
        }).catch(errorHandler);
      }).catch(errorHandler);
    }).catch(errorHandler);
  });
  // POST - /
  app.post('/', bodyParser.text({ type: '*/*' }), (req, res) => {
    log.info('express::post', 'received - %s', req.ip);
    // error handler
    const errorHandler = (error) => {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.send(JSON.stringify({ success: false, error: error.toString() }, null, 2));
      log.warn('express::post', 'sent - %s', error);
    };
    // request
    let request = null; // { token: "", text: "" }
    try {
      request = JSON.parse(req.body);
    } catch (error) {
      errorHandler(error);
      return;
    }
    if (!request) {
      errorHandler('empty request');
      return;
    }
    if (request.token != setting.token) {
      errorHandler('invalid token');
      return;
    }
    if (typeof request.text != 'string') {
      errorHandler('empty text');
      return;
    }
    log.info('express::post', 'message - %s', request.text);
    user.say(request.text).then(() => {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.send(JSON.stringify({ success: true }, null, 2));
      log.info('express::post', 'sent - success');
    }).catch(errorHandler);
  });
  // port - 3000
  app.listen(3000, function () {
    log.info('express::start', 'listening - 3000');
  });
};

// wechaty

const robot = new Wechaty({ name: 'wechat-assistance' });

const exit = () => {
  robot.stop().then(() => {
    process.exit(0);
  });
};

robot.on('scan', (qrcode, status) => {
  if (status === ScanStatus.Waiting) {
    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('');
    log.info('wechaty::scan', '%s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl);
    return;
  }
  log.info('wechaty::scan', '%s(%s)', ScanStatus[status], status);
  if (status === ScanStatus.Timeout) {
    exit();
  }
});

robot.on('login', (u) => {
  log.info('wechaty::login', 'login - {name: %s}', u.name());
  if (setting.userAlias) {
    robot.Contact.find({ alias: setting.userAlias }).then((contact) => {
      if (contact) {
        user = contact;
        log.info('wechaty::login', 'user - {name: %s, alias: %s}', user.name(), setting.userAlias ? setting.userAlias : '');
      } else {
        user = u;
        log.info('wechaty::login', 'user - {name: %s}', user.name());
      }
      launchHttpServer();
    }).catch((error) => {
      user = u;
      log.info('wechaty::login', 'user - {name: %s}', user.name());
      log.warn('wechaty::login', 'warn - %s', error);
      launchHttpServer();
    });
  } else {
    user = u;
    log.info('wechaty::login', 'user - {name: %s}', user.name());
    launchHttpServer();
  }
});

robot.on('message', (message) => {
  messageHandler(message, user, robot);
});

robot.on('friendship', (friendship) => {
  const friendshipText = friendship.toJSON();
  user.say(`好友申请\n\n${friendshipText}`).then(() => {
    log.error('wechaty::friendship', 'forward - %s', friendshipText);
  }).catch((error) => {
    log.error('wechaty::friendship', error.toString());
  });
});

robot.on('room-invite', (roomInvitation) => {
  // TODO: bug - event connot be emitted.
  roomInvitation.toJSON().then((roomInvitationText) => {
    user.say(`群聊邀请\n\n${roomInvitationText}`).then(() => {
      log.error('wechaty::room-invite', 'forward - %s', roomInvitationText);
    }).catch((error) => {
      log.error('wechaty::room-invite', error.toString());
    });
  }).catch((error) => {
    log.error('wechaty::room-invite', error.toString());
  });
});

robot.on('error', (error) => {
  log.info('wechaty::error', '%s', error.toString());
});

robot.on('logout', () => {
  log.info('wechaty::logout');
  exit();
});

// TODO: bug - fail to start at the first time.
robot.start().then(() => {
  log.info('wechaty::start');
}).catch((error) => {
  log.error('wechaty::start', error.toString());
});
