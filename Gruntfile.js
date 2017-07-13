module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      // define the files to lint
      files: ['Gruntfile.js', 'application.js','public/js/app.js','public/js/**/*.js', 'test/**/*.js'],
      // configure JSHint (documented at http://www.jshint.com/docs/)
      options: {
        // more options here if you want to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true
        }
      }
    },

    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint','nodemon','watch']
    },

    env: {
      options: {},
      // environment variables - see https://github.com/jsoverson/grunt-env for more information
      local: {
        FH_USE_LOCAL_DB: true,
        FH_SERVICE_MAP: function() {
          /*
           * Define the mappings for your MBaaS services here - for local development.
           * You must provide a mapping for each service you wish to access
           * This can be a mapping to a locally running instance of the service (for local development)
           * or a remote instance.
           */
          var serviceMap = {
            'MBaaS_SERVICE_GUID_1': 'http://127.0.0.1:8000',
            'MBaaS_SERVICE_GUID_2': 'https://host-and-path-to-service'
          };
          return JSON.stringify(serviceMap);
        }
      }
    },

    ngconstant: {
      // Options for all targets
      options: {
        space: '  ',
        wrap: '(function(){\n\n"use strict";\n\n {\%= __ngModule %}\n\n})();',
        name: 'config',
      },
      // Environment targets
      local: {
        options: {
          dest: 'public/js/util/config.js'
        },
        constants: {
          ENV: {
            name: 'local',
            apiEndpoint: 'http://localhost:8000'
          }
        }
      },
      remote: {
        options: {
          dest: 'public/js/util/config.js'
        },
        constants: {
          ENV: {
            name: 'remote',
            apiEndpoint: ''
          }
        }
      }
    },

    nodemon: {
      dev: {
        script: 'application.js'
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-ng-constant');

  grunt.registerTask('serve', function (target) {
    if (target === 'local') {
      return grunt.task.run(['ngconstant:local', 'jshint', 'nodemon', 'watch']);
    }

    return grunt.task.run(['ngconstant:remote', 'jshint', 'nodemon', 'watch']);
  });

  grunt.registerTask('default', ['serve:local', 'jshint','nodemon','watch']);

};
