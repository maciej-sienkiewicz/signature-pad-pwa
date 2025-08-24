pipeline {
    agent none

    stages {
        stage('Docker Build & Push') {
            agent {
                label 'docker'
            }
            steps {
                sh 'docker build -f ./deploy/Dockerfile -t 172.17.0.1:5000/signature-pad-pwa:latest .'
                sh 'docker push 172.17.0.1:5000/signature-pad-pwa:latest'
            }
        }
    }

}
