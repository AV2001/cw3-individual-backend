const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Middleware that logs the resource the user has requested for.
app.use((req, res, next) => {
    console.log(`You requested for '${req.url}'`);
    next();
});

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectId;
let db;
MongoClient.connect(
    'mongodb+srv://test:1234@cluster0.es4s8d0.mongodb.net/test',
    (err, client) => {
        db = client.db('webstore');
    }
);

// Gets the name of the collection
app.param('collectionName', (req, res, next, collectionName) => {
    req.collection = db.collection(collectionName);
    return next();
});

// Retrieves the lessons from the database and sends it to the front-end
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e);
        res.send(results);
    });
});

// 'POST' request to insert documents into the orders collection.
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insertOne(req.body, (e, results) => {
        if (e) return next(e);
        res.send(results.ops);
    });
});

// 'PUT' request to update spaces for a particular lesson
app.put('/collection/:collectionName', (req, res, next) => {
    req.body.forEach(lesson => {
        const lessonID = { _id: new ObjectID(lesson._id) };
        const updateSpaces = { $set: { spacesLeft: lesson.spacesLeft } };
        req.collection.updateOne(
            lessonID,
            updateSpaces,
            { safe: true, multi: false },
            (err, result) => {
                if (err) return next(err);
                // res.send(result ? { message: 'success' } : { message: 'error' });
            }
        );
    });
});

// Implements search-as-you-type functionality based on subject and location.
app.get('/collection/:collectionName/search/:serchTerm', (req, res) => {
    const { searchTerm } = req.params;
    req.collection.find({}).toArray((err, results) => {
        if (err) return next(err);
        const lessons = results.filter(lesson => {
            return (
                lesson.subject.toLowerCase().match(searchTerm.toLowerCase()) ||
                lesson.location.toLowerCase().match(searchTerm.toLowerCase())
            );
        });
        res.send(lessons);
    });
});

// Middleware that returns the image if the path provided by the user exists.
app.use((req, res, next) => {
    const filePath = path.join(__dirname, 'static', req.url);
    fs.stat(filePath, (err, fileInfo) => {
        if (err) {
            next();
            return;
        }

        if (fileInfo.isFile()) {
            res.sendFile(filePath);
        } else {
            next();
        }
    });
});

// Middleware to display an error if the file is not found.
app.use((req, res) => {
    res.status(400);
    res.send('<h1>FILE NOT FOUND!</h1>');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('SERVER STARTED ON PORT: 3000 🫡'));
