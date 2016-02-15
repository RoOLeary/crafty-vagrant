'use strict';

// Load plugins:
var gulp    = require('gulp');
var gutil   = require('gulp-util');
var plugins = require('gulp-load-plugins')();

// Source and destination paths for tasks:
var path = {
  src:   './app/src',
  dest:  './app/public',
  npm:   './node_modules',
  // Path to /app/public on the staging environment (for rsync):
  stage: 'user@servername:/path/to/site/app/public'
};

/**
 * $ gulp
 *
 * - compile, autoprefix, and minify Sass
 * - bundle Javascript
 * - optimise images (including SVGs)
 * - create custom Modernizr build
 */
gulp.task('default', [
  'styles',
  'browserify',
  'images',
  'modernizr'
]);

/**
 * $ gulp watch
 *
 * - watch for updates to scripts, styles, and Gulpfile
 * - process files appropriately on change
 */
gulp.task('watch', [
  'watch:scripts',
  'watch:styles',
  'watch:gulpfile'
]);

gulp.task('watch:gulpfile', function(){
  gulp.watch('Gulpfile.js', [
    'jshint'
  ]);
});

gulp.task('watch:scripts', function(){
  gulp.watch(path.src + '/scripts/**/*.js', [
    'jshint',
    'browserify'
  ]);
});

gulp.task('watch:styles', function(){
  gulp.watch(path.src + '/styles/**/*.scss', [
    'styles'
  ]);
});

/**
 * $ gulp images
 *
 * - Optimise images (new and updated images only)
 */
gulp.task('images', function(){
  var src  = path.src  + '/images/{,*/}*.{gif,jpg,png,svg}';
  var dest = path.dest + '/images';

  return gulp.src(src)
    // Only process new / updated images:
    .pipe(plugins.newer(dest))
    // Minify images:
    .pipe(plugins.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [
        { cleanupIDs: false },
        { removeDoctype: false } // Keeps IE happy
      ]
    }))
    .pipe(gulp.dest(dest));
});

/**
 * $ gulp styles
 *
 * - Compile Sass --> CSS, autoprefix, and minify
 */
gulp.task('styles', function(){
  gulp.src(path.src + '/styles/main.scss')
    // Compile Sass, autoprefix, and combine media queries:
    .pipe(plugins.pleeease({
        out: 'main.css',
        browsers: [
          'last 3 versions',
          'ie 8',
          'ie 9'
        ],
        minifier: false,
        mqpacker: true,
        sass: {
          includePaths: [
            path.src + '/styles',
            path.npm + '/bourbon/app/assets/stylesheets',
            path.npm + '/bourbon-neat/app/assets/stylesheets',
            path.npm + '/node.normalize.scss'
          ]
        }
      })
      .on('error', gutil.log)
    )
    // Write main.css
    .pipe(gulp.dest(path.dest + '/styles'))
    // Report file size:
    .pipe(plugins.size({ showFiles: true }))
    // Minify main.css and rename it to 'main.min.css':
    .pipe(plugins.cssmin())
    .pipe(plugins.rename({suffix: '.min'}))
    .pipe(plugins.size({ showFiles: true }))
    .pipe(gulp.dest(path.dest + '/styles'))
    .on('error', gutil.log);
});

/**
 * $ gulp browserify
 *
 * - Bundle Javascript with Browserify
 */
gulp.task('browserify', function(){
  gulp.src(path.src + '/scripts/main.js')
    .pipe(plugins.browserify())
    .pipe(plugins.rename('bundle.js'))
    .pipe(gulp.dest(path.dest + '/scripts'))
    .pipe(plugins.size({ showFiles: true }))
    .on('error', gutil.log);
});

/**
 * $ gulp jshint
 *
 * - lint Javascript files and Gulpfile.js
 */
gulp.task('jshint', function(){
  var src  = [
    'Gulpfile.js',
    path.src  + '/scripts/{,*/}*.js'
  ];

  gulp.src(src)
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter(require('jshint-stylish')));
});

/**
 * $ gulp modernizr
 *
 * - create a custom Modernizr build based on tests used
 *   in bundle.js and main.css
 */
gulp.task('modernizr', function(){
  var src = [
    path.dest + '/scripts/bundle.js',
    path.dest + '/styles/main.css'
  ];

  gulp.src(src)
    .pipe(plugins.modernizr())
    .pipe(plugins.uglify())
    .pipe(gulp.dest(path.dest + '/scripts'))
    .pipe(plugins.size({ showFiles: true }))
    .on('error', gutil.log);
});

/**
 * $ gulp rsync:fromstage
 * $ gulp rsync:tostage
 *
 * - Sync assets from/to remote site
 */
var rsyncOpts = {
  args: [
    '--archive',
    '--compress',
    '--stats',
    '--verbose'
  ],
  delete: false,
  exclude: ['.git*','*.scss','node_modules'],
  ssh:  true,
  recursive: true,
  compareMode: 'checksum'
};

gulp.task('rsync:fromstage', function(){
  var rsync = require('rsyncwrapper');
  var opts  = rsyncOpts;

  // From stage to local:
  opts.src  = path.stage + '/assets/';
  opts.dest = path.dest  + '/assets/';

  rsync(opts, function(err, stdout) {
    gutil.log(stdout);
  });
});

gulp.task('rsync:tostage', function(){
  var rsync = require('rsyncwrapper');
  var opts  = rsyncOpts;

  // From local to stage:
  opts.src  = path.dest  + '/assets/';
  opts.dest = path.stage + '/assets/';

  rsync(opts, function(err, stdout) {
    gutil.log(stdout);
  });
});
