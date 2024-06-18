const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, './views'));

// 1) GLOBAL MIDDLEWARE
// Set security HTTP headers
app.use(helmet());

// Further HELMET configuration for Security Policy (CSP)
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://cdnjs.cloudflare.com',
  'https://js.stripe.com/',
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = [
  'https://unpkg.com',
  'https://tile.openstreetmap.org',
  'ws://127.0.0.1:*',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const frameSrcUrls = ['https://js.stripe.com'];

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      scriptSrcElem: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", ...fontSrcUrls],
      frameSrc: ["'self'", ...frameSrcUrls],
    },
  }),
);

// Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Serving static files
app.use(express.static(`${__dirname}/public`));

// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);

  next();
});

// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'Hello from the server side!', app: 'Natours' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint...');
// });

// 2) ROUTE HANDLERS

//app.get('/api/v1/tours', getAllTours);
// Parametro opzionale /:y?
//app.get('/api/v1/tours/:id', getTour);
//app.post('/api/v1/tours', createTour);
//app.patch('/api/v1/tours/:id', updateTour);
//app.delete('/api/v1/tours/:id', deleteTour);

// 3) ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  //next(err);

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// 4) START SERVER

module.exports = app;
