

protocol : a protocol is the set of rules for how two computers communicate.
    rules: message format,order,timing,error handling

    http is an req res protocol . its amazing for websites apis and loading pages.but its terrible for fast back and forth conversations

    for live data we need a permanat two way connection thats where the socket is coming.websocket connection stays open in both client and server can send the messages anytime . this is called a full duplex

    cheaper than polling. in polling every req send large http headers. in ws once the connection is established the messages are tiny.

in ws ws:// is unincrypted and wss:// in encrypted


architechture:

life cycle of a websocket connection:
it has stages
1. connect - setup the socket with a new websocket with an specific path
2. upgrade- upgrade req the connection upgraded to websocket if server accept it replies with 101 switching protocols.http ends tunnel open both sides can send messages.
3. state- or memmory. ws are stateful. the server holds a reference to your socket in memory. it create another problem ghost connection. like if someone lose wifi or internet connection or battery dies close laptops. now server thinks the server still alive it holding the socket in memory this called ghost connection.
4. to fix ghost connection. in production ws server use heartbeat or called pingpong. periodic ping pong messages ensure the conenction remains active and detect dropped connections. its not polling the ping pong is an tinu impulse but in othere hand the polling entire http requests. lighter , cheaper, far easier on the battery

with websocket mostly u send messages.
two type data transfers
1. text json
2. binary raw: audio stream, video streaming, mulit player games etch
when the user array buffer or blob

most realtime apps send jsons

websocket use opcode its a label thats say it says this frame is text,binary,pinpong etch

back pressure: if server send update ike craz y but user have slow internet connection . new messages start piling up memory thats called backpressuere. we monitor how much data is buffer if it become so high. they slowdown the sending rate so the server dont explode.

there different libraries for live connectin
socket io, pusher, and ably and ws library


socker io . most popular realtime library. it gives full manaagement suite 
reconnect ,roomes,fallback the whole package its heavier. every message come with extra over head . not purest speed for development


ws: 
 this is low level. but hight performance rate. build everything for your selves, rooms reconnections heartbeats auth logic all you.

 if performance and low latency matters its the real deal



 websocket is basicaly a state machine

 4 state
 connecting , open, closing, closed 

server
wss.on("connection",(ws)=>{
    ws.on ("message:,(data)=>{})
    ws.on ("error:,(err)=>{})
    ws.on ("close:,(data)=>{})

})


clent side
const socket = newWebSocket("ws://")
socker.onopen=()=>{}
socket.onMessage=(e)=>{}
socket.onError=()=>{}
socket.onClose=()=>{}

its the life cycle and methods on socket


socket patterns

envelope pattern
in real life you dont send raw messages instead of it ou send message envelope that includes intend
ex:
{
    type:"CHAT_MESSAGE", // what logic to run
    id:"uuid-123", // track the message
    payload:{text:"Hey, everyone",roomId:"general"} ,// actual data
    metadata:{sentAt:1705622400} //optional context
}
with switch we can easily track these data clean and scalable

two types
1 type based commands 
{type:""} perfect for chat apps,dashbaords,collaborative tools

2 topic based messageed use when channel are dynamic
 {topic:"stock:AAPL",data:{price:140}}
 perfect for sensors,tickers and live markets or sport engines

then you have to choose the data transer format
json text or binary raw bytes.

binay use when messages are of a high frequency


patterns

.Broadcast. one to all (mega phone pattern). one message goest to all users
.unicast . one to onw (dm ) only one person get the message, private msg , notifications
.muliticast.  one to many. send message to pecific room. you send to specific room. groops discord like that


weboscket are fast.
acks: acknowlegements u send the packages with an id and the server process it replies with same id as a reciept. if didnt get reciept retry

pubsub pattr:
 subsctibe to an newspaper . you only recieve what you care aboutfor ex user a sub to apple stoct. if aple stock update only recieve a like that


 a real system uses a message broker like redis . the broker becomes the centeral broadcast layer between all servers. thats how u scale to mellions.
 when u have multiple server each server only knows their clients so if server1 public an update server 2 dont know . there we use message broker



 ### beyond the socket


 when u should use websocket what kind of data should go through it.

ws are powerfull but theyre not a silver bullet

if u try to push 4k with ws server will explode and lag

webrtc = for voice video and p2p
for heavy media through server is expensive and complex thats where webrtc is coming.
webrtc allows two browsers talk directly peer to peer with ultra low latency thats perfect for audio and video. the only catch that webrtc needs a matchmaking phase. the two browsers need a way to find each other and exchange connection information this step called signalling

when to use websocket
two way real time apps
chat 
collaborations 
dashboards

webrtc
heavy media peer to peer
voice calls
video calls
file transfers


webtransport
ultra low latency straming
high performance
real time systems

sse server side events
one way server updates
stock tickers
feeds
streaming data


use this rule does the server neeeds to push updates?
sse or websockets
does the client needs to talk back?
websockets



setup of the database 
postgress and neon . we broacasting the data;

teh data base is the source of the record and the websocketsn are just distribution layer.

we using postgress neon postgress.