let express = require(`express`);
let app = express();
let cors = require('cors')
let port = 3000;
app.listen(port, function () {
    console.log(`Сервер запущен: http://localhost:${port}`)
});

app.use(cors())
app.use(express.json())
app.use(express.static('public'));



// Настройка БД
let mongoose = require('mongoose');
const { createApp } = require('vue');
mongoose.connect('mongodb://127.0.0.1:27017/bvito');


// Схемы
let schema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    category: String,
    image: String,
    isMine: Boolean
}, {
    timestamps: true
});

let Product = mongoose.model('product', schema);

// Роуты



// Задание 1: Получение объявлений
app.get(`/products`, async function (req, res) {
    let title = req.query.title;
    let category = req.query.category;
    let sort = Number(req.query.sort);
    let search = {}; // объект настроек поиска
    let sorting = {}; // объект настроек сортировки

    if (title) {
        search.title = title;
    }
    if (category) {
        search.category = category;
    }
    if (sort) {
        sorting.sort = sort;
    }

    let data = await Product.find(search).sort(sorting).limit(10)
    res.send(data);
});


// Задание 2: Мои объявления
app.get(`/products/my`, async function (req, res) {
    let data = await Product.find({ isMine: true }).sort({ createdAt: -1 });
    res.send(data);
});


// Задание 2: Создаём объявление
app.post(`/products`, async function (req, res) {
    // Прочитай каждое значение из тела запроса
    let title = req.body.title;
    let description = req.body.description;
    let price = Number(req.body.price);
    let category = req.body.category;
    let image = req.body.image;

    //проверять все ли поля заполнены
    if(!title || !description || !price || !category) {
        res.sendStatus(400);
        return
    }
    //проверять дубли
    let dooble = await Product.exists({title: title});
    if (dooble) {
        res.sendStatus(400);
        return
    }

    // Создай новый товар-объявление
    let product = new Product({
        title: title,
        description: description,
        price: price,
        category: category,
        image: image,
        isMine: true
    })
    await product.save();
    res.sendStatus(201)
});


// Задание 3: Удаление
app.delete(`/products`, async function (req, res) {
    let id = req.query.id;
    await Product.deleteOne({_id: id});
    res.sendStatus(200);
});

