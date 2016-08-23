/*
    Init modules
 */

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const eslint = require('gulp-eslint');
const nodemon = require('gulp-nodemon');
const lab = require('gulp-lab');
// uglify is only es5 compatible.
const minifier = require('gulp-uglify/minifier');
const uglifyEs6 = require('uglify-js-harmony');
const pump = require('pump');

/*
    Config
 */

const sourceFolder = 'src/';
const sourceGlob = `${sourceFolder}**/*.js`;
const testFolder = 'test/';
const testGlob = `${testFolder}*.js`;
const distFolder = 'build/';
const distGlob = `${distFolder}*.js`;

const appEntry = 'index.js';

const babelConfig = {
    presets: ['node5'],
};

const uglifyConfig = {
    // TODO: sourcemap
};

const nodemonConfig = {
    script: distFolder + appEntry,
    watch: sourceFolder,
    tasks: ['transpile'],
    verbose: true,
};

/*
    Tasks
 */

// compile src/* files into a single one & create sourcemaps
gulp.task('transpile', () =>
    gulp.src(sourceGlob)
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(concat(appEntry))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(distFolder))
);

gulp.task('minify', ['transpile'], () =>
    // why is pump needed
    // https://github.com/terinjokes/gulp-uglify/blob/master/docs/why-use-pump/README.md#why-use-pump
    pump([
        gulp.src(distGlob),
        minifier(uglifyConfig, uglifyEs6),
        gulp.dest(distFolder),
    ])
);

// start nodemon and if any change occured, compile
gulp.task('dev', ['transpile'], () =>
    nodemon(nodemonConfig)
);

// make a deployable-ready manifestation
gulp.task('build', ['minify']);

// run lint tests
gulp.task('lint', () =>
    gulp.src(['src/*.js', '!node_modules/**'])
        .pipe(eslint())
        .pipe(eslint.format())
);

// unit test & code coverage
gulp.task('test', ['lint'], () =>
    gulp.src(testGlob)
        .pipe(lab({
            // leak detection is bugged due to babel-runtime
            // todo code coverage
            args: [
                '-v', '-C', '-c',
                '-S', '-l', '-T', 'test/config/babel-lab.js',
            ],
            opts: {
                emitLabError: true,
            },
        }
    ))
);
