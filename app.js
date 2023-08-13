const PoeApi = require('./poe');
const express = require('express');
const cors = require('cors')
const appServer = express();
const bodyParser = require("body-parser");
const io = require("socket.io");
const axios = require("axios")
const socketServer = io(3002, {
    cors: {
        origin: '*',
    }
})

const WebSocket = require("ws");
var sessionSocket;
const getMinSeq = async () => {
    const client = axios.create({
        headers: {
            Cookie: "p-b=8G9_rnH6ns3RoFOmvElcxA%3D%3D"
        }
    })
    return client.get("https://poe.com/api/settings?channel=poe-chan59-8888-opkngsaduxjjwjqrwowx")
        .then((response) => {
            return response?.data?.tchannelData?.minSeq;
        })
        .catch((error) => {
            console.log(error.message);
            throw error;
        });
}
var socket;
const initSocket = async () => {

    var timeHost = await getMinSeq();
    var idHost = Math.floor(1e6 * Math.random()) + 1;
    socket = new WebSocket(`wss://tch${String(idHost)}.tch.poe.com/up/chan59-8888/updates?min_seq=${timeHost}&channel=poe-chan59-8888-opkngsaduxjjwjqrwowx&hash=8151090595657988248`)

    socket.on('error', console.error);

    socket.on('open', () => {
        console.log("connected")
    });

    socket.on('message', function message(data) {
        console.log(JSON.parse(data));
        socketServer.emit("message", JSON.parse(data))
    });
    socket.on("close", (code, reason) => {
        console.log("Disconnected with code:", code, "and reason:", reason);
        initSocket();
    });
}

initSocket();








appServer.use(cors({
    origin: '*', // Chỉ cho phép yêu cầu từ origin này
    methods: ['GET', 'POST'], // Chỉ cho phép sử dụng các phương thức GET và POST 
}))
appServer.use(bodyParser.json());



// const Poe = new PoeApi("w_ei-UJsVthuUVS1iY6T5Q==");
// Poe.getFormkey().then((data) => {
//     Poe.client.defaults.headers["Quora-Formkey"] = data;
//     // const chatID = Poe.getChatId("capybara").then(data => {

//     // const res = Poe.sendMessage("xin chao poe", "capybara", data);
//     // });

// }).catch((error) => {
//     console.log(error);
// });


appServer.get("/start-app/:session", async (req, res) => {
    const session = req.params.session;
    const Poe = new PoeApi({
        ...HEADERS,
        Cookie: "m-b=" + session,
    });
    var success = true;
    var message = "ok";
    var formKey;
    var chatID;
    try {
        formKey = await Poe.getFormkey();

        Poe.client.defaults.headers["Quora-Formkey"] = formKey;

        const data = await Poe.getChatId("capybara");
        chatID = data.chatID;
        res.setHeader('Set-Cookie', data.cookies?.map((cookie) => {
            var data = cookie.replace("Domain=.quora.com;", "")
            data = data.replace("HttpOnly", "")
            return data;
        }));
    } catch (error) {
        message = error.message
    }
    var response = {
        success: success,
        message: message,
        data: {
            chatID: chatID,
            formKey: formKey
        }
    }


    res.send(response);
})

var HEADERS = {
    'Host': 'www.quora.com',
    'Accept': '*/*',
    'apollographql-client-version': '1.1.6-65',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Poe 1.1.6 rv:65 env:prod (iPhone14,2; iOS 16.2; en_US)',
    'apollographql-client-name': 'com.quora.app.Experts-apollo-ios',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
};


appServer.post("/question", async (req, res) => {
    var success = true;
    var message = "ok";
    const query = req.body.q;

    const chatID = req.headers["chat-id"];
    const formKey = req.headers["form-key"];
    const cookies = req.headers["authorization"];

    const Poe = new PoeApi({
        ...HEADERS,
        Cookie: cookies,
        "Quora-Formkey": formKey
    });
    const data = await Poe.sendMessage(query, "capybara", chatID)

    var response = {
        success: success,
        message: message,
        data: data
    }
    res.send(response);
});








appServer.listen(3001, () => {
    console.log(`Example app listening on port ${3001}`)
})


