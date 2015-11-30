'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          require: 'coffee-script'
        },
        src: ['test/**/*.coffee']
      }
    },
    release: {
      options: {
        tagName: 'v<%= version %>',
        commitMessage: 'Prepared to release <%= version %>.'
      }
    },
    watch: {
      files: ['Gruntfile.js', 'src/**/*.coffee', 'test/**/*.coffee'],
      tasks: ['test']
    },
    coveralls: {
        // Options relevant to all targets
        options: {
          // When true, grunt-coveralls will only print a warning rather than
          // an error, to prevent CI builds from failing unnecessarily (e.g. if
          // coveralls.io is down). Optional, defaults to false.
          force: false
        }
      }
  });

  // load all grunt tasks
  require('matchdep').filterDev(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

  grunt.registerTask('test', ['mochaTest']);
  grunt.registerTask('test:watch', ['watch']);
  grunt.registerTask('default', ['test']);
};
