const express = require('express');
const morgan = require('morgan');
// eslint-disable-next-line import/no-extraneous-dependencies
const cors = require('cors');

const path = require(`path`);
const rateLimit = require(`express-rate-limit`);
const helmet = require(`helmet`);
const mongoSanitize = require(`express-mongo-sanitize`);
const xss = require(`xss-clean`);
const hpp = require(`hpp`);
const cookieParser = require(`cookie-parser`);
const reviewRouter = require(`./routes/reviewRoutes`);
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');

const compression = require(`compression`);
const globalErrorHandler = require(`./controllers/errorController`);
const AppError = require(`./utils/appError`);

const app = express();
app.enable('trust proxy');
app.set(`view engine`, `pug`);
app.set(`views`, path.join(__dirname, `views`));
// 1) GLOBAL MIDDLEWARE
// Implement CORS
app.use(cors());
app.options('*', cors());
// Serving static files
app.use(express.static(path.join(__dirname, `public`)));
// Set HTTP Headers
// app.use(helmet());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: `Too many requests!`
});
app.use(`/api`, limiter);
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);
// Body parser,reading data from body to req.body
app.use(express.json({ limit: `10kb` }));
app.use(express.urlencoded({ extended: true, limit: `10kb` }));
app.use(cookieParser());
// Data sanitization
app.use(mongoSanitize());
app.use(xss());
// Prevent paramter pollution
app.use(
  hpp({
    whitelist: [
      `duration`,
      `ratingsAverage`,
      `ratingsQuantity`,
      `maxGroupSize`,
      `difficulty`,
      `price`
    ]
  })
);
app.use(compression());
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});
// 3) ROUTE
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
app.all(`*`, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);
// 4) SERVER START
module.exports = app;
