from flask import Flask, render_template, session, request
from threading import Timer

import flask

import skimage.io
import numpy as np
# import matplotlib.pyplot as plt
import time
import io
import mockup
from GUI_prep import *

# TODO: Sessions persist accros tabs. so maybe do it somehow only within the tab
# create userID in the index function in this python app
# for each picture upload in the javascript create a pictureID, transfer this with
# get to all the web api calls
# in the webserver combine them to get a unique hash

async_mode = None

app = Flask(__name__)
app.config['SECRET_KEY'] = '939fkj3kwlsk4958204kfjnkl39f9Ixne9l39((d'
global cleanUpInterval 
cleanUpInterval = 20 


global currentlyClassified
currentlyClassified = {}
global nextToRemove, freshImages
nextToRemove = []
freshImages  = []

def cleanupImageBase():
    global nextToRemove, freshImages, currentlyClassified, cleanUpTimer
    print("next: {}, fresh: {}".format(nextToRemove, freshImages))
    for imageHash in nextToRemove:
        del currentlyClassified[imageHash]
        print("in the loop")

    nextToRemove = freshImages
    freshImages = []
    print("cleaned up")

    cleanUpTimer = Timer(60*cleanUpInterval, cleanupImageBase)
    cleanUpTimer.start()


def pairInts(intA, intB):
    """pais two ints uniquly into one"""
    return int(0.5*(intA + intB)*(intA + intB +1)+intB)

@app.route('/')
def index():
    if not 'sessionID' in session:
        print("made new sessionID")
        sessionID = int(time.time()*100%1000000)
        session['sessionID'] = sessionID
    return render_template('index.html')


@app.route('/api/classifyImage/<imageID>', methods=['POST'])
def classifyImage(imageID):
    if not 'sessionID' in session:
        answer = {'message': 'there is no request for this session'}
        resp = flask.jsonify(answer)
        resp.status_code = 400
        return resp

    imageHash = pairInts(session['sessionID'], int(imageID))

    img = skimage.io.imread(request.files['file'])
    # imgCropped = mockup.faceCrop(img)
    imgCropped = GUI_prep(img)
    if(imgCropped is None):
        resp = flask.jsonify({'message': 'We could not detect exactly one face in your image'})
        resp.status_code = 400
        return resp

    currentlyClassified[imageHash] = imgCropped #put in a list of all the found images
    freshImages.append(imageHash)

    label = mockup.classifyImage(imgCropped)

    answer = {'label': label}
    #print("new Request id:{} , length of dict after:{}".format(sessionID, len(currentlyClassified)))

    return flask.jsonify(answer)

@app.route('/api/correctClassification/<imageID>', methods=['POST'])
def correctClassification(imageID):
    mistake = checkIfCorrectRequestedImage(imageID)
    if mistake is not None:
        print("no Request in correctClassification")
        return mistake

    sessionID = session["sessionID"]
    imageHash = pairInts(sessionID, int(imageID))

    newName = request.form["newName"]

    pic = currentlyClassified[imageHash]
    mockup.updateClassification(pic, newName)
    print("upadate sessionID: {}, length of dict: {}".format(sessionID, len(currentlyClassified)))
    return flask.jsonify({"message":"py says success"})



@app.route('/api/actorList')
def getActorList():
    """return list of all actors"""
    return flask.jsonify(mockup.getActorList())

@app.route('/api/actorInfo/<name>')
def actorInfoByName(name):
    """given an actor name as specified by the getActorList give back info as json"""
    return "We don't have any info text available for anyone."



@app.route('/api/getPreProcessedImg/<id>/<timestamp>')
def getImageTS(id, timestamp):
    #nobody needs the timestamp its just there so the browser autoloads the new image
    #probably a hack
    time.sleep(0.2)
    return getImage(id)

@app.route('/api/getPreProcessedImg/<imageID>')
def getImage(imageID):
    mistake = checkIfCorrectRequestedImage(imageID)
    if mistake is not None:
        return mistake

    time.sleep(0.2)

    sessionID = session["sessionID"]
    imageHash = pairInts(sessionID, int(imageID))

    pic = currentlyClassified[imageHash]

    picSaved = io.BytesIO()
    skimage.io.imsave(picSaved, pic)

    #putting the reader at the begining of the file:
    picSaved.seek(0)

    #############
    # img = skimage.io.imread(picSaved)
    # plt.ion()
    # plt.imshow(img)
    # plt.show()
    # plt.pause(1)
    print('sending')
    return flask.send_file(picSaved, mimetype="image/jpeg", cache_timeout=0.1)


def checkIfCorrectRequestedImage(imageID):
    if not 'sessionID' in session:
        answer = {'message': 'there is no request for this session'}
        resp = flask.jsonify(answer)
        resp.status_code = 400
        return resp
    sessionID = session['sessionID']
    imageHash = pairInts(sessionID, int(imageID))

    if (not imageHash in currentlyClassified):
        answer = {'message': 'the requested image does not exist'}
        resp = flask.jsonify(answer)
        resp.status_code = 400
        return resp
    return None


if __name__ == '__main__':
    print('in my file')
    cleanupImageBase()
    Flask.run(app, debug=False)
    cleanUpTimer.cancel()
    print("ended gracefully")


