const { program } = require('commander');
const path = require('path');
const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');

const swaggerJsDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Notes API",
            version: "1.0.0",
            description: "API for managing notes",
        },
        servers: [
            {
                url: "http://localhost:3000", 
            },
        ],
    },
    apis: ["./main.js"], // Шлях до вашого основного файлу
};

const swaggerDocs = swaggerJsDoc(options);
module.exports = swaggerDocs;

const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger-config');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));



const upload = multer();
const app = express();

program
  .requiredOption('-h, --host <host>', 'address of the server')
  .requiredOption('-p, --port <port>', 'port of the server')
  .requiredOption('-c, --cache <path>', 'path for directory with cache files')
  .parse(process.argv);

const { host, port, cache } = program.opts();

app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// Перевірка існування нотатки
async function noteExists(noteName) {
    try {
        await fs.access(path.join(cache, `${noteName}.txt`));
        return true;
    } catch {
        return false;
    }
}


/**
 * @swagger
 * /notes/{noteName}:
 *   get:
 *     summary: Get a specific note
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the note to retrieve
 *     responses:
 *       200:
 *         description: Note retrieved successfully
 *       404:
 *         description: Note not found
 */
app.get('/notes/:noteName', async (req, res) => {
    try {
        const { noteName } = req.params;
        if (!await noteExists(noteName)) {
            return res.status(404).send('Note not found');
        }
        const content = await fs.readFile(path.join(cache, `${noteName}.txt`), 'utf-8');
        res.send(content);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});
/**
 * @swagger
 * /notes/{noteName}:
 *   put:
 *     summary: Update an existing note
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the note to update
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       404:
 *         description: Note not found
 */
app.put('/notes/:noteName', async (req, res) => {
    try {
        const { noteName } = req.params;
        if (!await noteExists(noteName)) {
            return res.status(404).send('Note not found');
        }
        await fs.writeFile(path.join(cache, `${noteName}.txt`), req.body);
        res.status(200).send('Note updated');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});
/**
 * @swagger
 * /notes/{noteName}:
 *   delete:
 *     summary: Delete a specific note
 *     parameters:
 *       - in: path
 *         name: noteName
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the note to delete
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */

// DELETE /notes/<ім'я нотатки>
app.delete('/notes/:noteName', async (req, res) => {
    try {
        const { noteName } = req.params;
        if (!await noteExists(noteName)) {
            return res.status(404).send('Note not found');
        }
        await fs.unlink(path.join(cache, `${noteName}.txt`));
        res.status(200).send('Note deleted');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// GET /notes
app.get('/notes', async (req, res) => {
    try {
        const files = await fs.readdir(cache);
        const notes = await Promise.all(
            files
                .filter(file => file.endsWith('.txt'))
                .map(async (file) => {
                    const name = path.basename(file, '.txt');
                    const text = await fs.readFile(path.join(cache, file), 'utf-8');
                    return { name, text };
                })
        );
        res.json(notes);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.post('/write', upload.none(), async (req, res) => {
    try {
        const { note_name, note } = req.body;
        if (await noteExists(note_name)) {
            return res.status(400).send('Note already exists');
        }
        await fs.writeFile(path.join(cache, `${note_name}.txt`), note);
        res.status(201).send('Note created');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// GET /UploadForm.html
app.get('/UploadForm.html', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<body>
  <h2>Upload Form</h2>

  <form method="post" action="/write" enctype="multipart/form-data">
    <label for="note_name_input">Note Name:</label><br>
    <input type="text" id="note_name" name="note_name"><br><br>
    <label for="note_input">Note:</label><br>
    <textarea id="note" name="note" rows="4" cols="50"></textarea><br><br>
    <input type="submit" value="Create Note">
  </form>

  <p>Click "Create Note" button to create a new note on the server.</p>

</body>
</html>`);
});

// Базовий роут
app.get('/', (req, res) => {
    res.send("Hello");
});

// Створення директорії для кешу, якщо вона не існує
async function ensureCacheDirectory() {
    try {
        await fs.access(cache);
    } catch {
        await fs.mkdir(cache, { recursive: true });
    }
}

// Запуск сервера
const server = app.listen(port, host, async () => {
    await ensureCacheDirectory();
    console.log(`Server is running at http://${host}:${port}`);
    console.log(`Cache directory: ${path.resolve(cache)}`);
});