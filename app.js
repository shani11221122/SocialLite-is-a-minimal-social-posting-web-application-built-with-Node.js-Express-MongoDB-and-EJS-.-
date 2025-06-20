const express = require('express');
const app= express();
const bcrypt=require("bcrypt");
const jwt = require('jsonwebtoken');

const userModel = require ('./models/user');
const postModel = require ('./models/post');


app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.render('index');
}   );

app.get('/register', (req, res) => {
  res.render('index'); // you can render a separate EJS form view if needed
});

app.get('/profile', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate('posts');
  res.render("profile", { user, posts: user.posts }); 
});


app.get('/posts/:id/edit', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");
  res.render("edit", { post });
});


app.post('/update/:id', isLoggedIn, async (req, res) => {
  await postModel.findByIdAndUpdate(req.params.id, { content: req.body.content });
  res.redirect("/profile");
});


app.get('/posts/:id/like', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);
  const userId = req.user?._id?.toString();
  if (!post || !userId) return res.redirect("/profile");

  const index = post.likes.findIndex(id => id?.toString() === userId);
  if (index === -1) post.likes.push(userId);
  else post.likes.splice(index, 1);

  await post.save();
  res.redirect("/profile");
});




app.post('/post',isLoggedIn,async(req,res)=>{
  let user= await userModel.findOne({email :req.user.email})
  let{content}=req.body;
  let post = await postModel.create({
    user:user._id,
    content : content,
    likes : []
    
  })
  user.posts.push(post._id);
  await user.save();
  res.redirect('/profile');
});

app.get('/login', (req, res) => {
  res.render('login'); 
});

app.post('/register', async (req, res) => {
  let { name, age, email, username, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(400).send('User already exists');

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let newUser = await userModel.create({
        name,
        age,
        email,
        username,
        password: hash
      });
     let token = jwt.sign({ id: newUser._id , email: newUser.email }, "kay");
     res.cookie('token', token);
     res.send('User registered successfully');

    });
  });
});


app.post('/login', async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(400).send('User Not  exists');

  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      return res.status(400).send('Something went wrong');
      res.redirect('/login');
    }
    else{
    
    let token = jwt.sign({ id: user._id , email: user.email }, "kay");
    res.cookie('token', token);
    res.status(200).redirect('/profile');
   
    }
  }
);
});

app.post('/logout',  (req, res) => {
  res.clearCookie('token');
  res.redirect('/login')
  //res.send('User logged out successfully');
})

function isLoggedIn(req, res, next) {
  if (!req.cookies.token) {
    res.redirect("/login");
  } else {
    let data = jwt.verify(req.cookies.token, "kay");
    req.user = data;
    next();
  }
}







app.listen(3000 ,()=>{
console.log('Server is running on port 3000');
});