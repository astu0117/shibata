#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>

/*
 * DNN for Breakeven Analysis (Standard Double Precision)
 * Author: Shibata Atsushi
 */

typedef struct {
    double w1[8][2];
    double b1[8];
    double w2[1][8];
    double b2[1];
} DNN;

double sigmoid(double x) {
    return 1.0 / (1.0 + exp(-x));
}

int main() {
    double raw[4][2] = {
        {710.0, 813.0},
        {118.0, 541.0},
        {418.0, 81.0},
        {782.0, 46.0}
    };
    double targets[4];
    for(int i=0; i<4; i++) targets[i] = (raw[i][0] + raw[i][1]) / 2000.0;

    DNN net;
    srand(42);
    for(int i=0; i<8; i++) {
        for(int j=0; j<2; j++) net.w1[i][j] = ((double)rand()/RAND_MAX - 0.5) * 0.1;
        net.b1[i] = 0.0;
        net.w2[0][i] = ((double)rand()/RAND_MAX - 0.5) * 0.1;
    }
    net.b2[0] = 0.0;

    printf("DNN Breakeven Analysis (Shibata Atsushi)\n");
    printf("Training data loaded successfully.\n\n");

    for(int epoch=0; epoch<=10000; epoch++) {
        double loss = 0;
        for(int s=0; s<4; s++) {
            double h[8], out = net.b2[0];
            double norm_in[2] = {raw[s][0]/1000.0, raw[s][1]/1000.0};
            for(int i=0; i<8; i++) {
                double sum = net.b1[i];
                for(int j=0; j<2; j++) sum += net.w1[i][j] * norm_in[j];
                h[i] = sigmoid(sum);
                out += net.w2[0][i] * h[i];
            }
            double err = out - targets[s];
            loss += err * err;
            
            // Backprop
            double d_out = 2.0 * err;
            for(int i=0; i<8; i++) {
                double d_h = d_out * net.w2[0][i] * h[i] * (1.0 - h[i]);
                net.w2[0][i] -= 0.05 * d_out * h[i];
                for(int j=0; j<2; j++) net.w1[i][j] -= 0.05 * d_h * norm_in[j];
                net.b1[i] -= 0.05 * d_h;
            }
            net.b2[0] -= 0.05 * d_out;
        }
        if(epoch % 2000 == 0) printf("Epoch %d: Loss %.10f\n", epoch, loss/4.0);
    }

    printf("\n--- Results ---\n");
    for(int s=0; s<4; s++) {
        double h[8], out = net.b2[0];
        double norm_in[2] = {raw[s][0]/1000.0, raw[s][1]/1000.0};
        for(int i=0; i<8; i++) {
            double sum = net.b1[i];
            for(int j=0; j<2; j++) sum += net.w1[i][j] * norm_in[j];
            h[i] = sigmoid(sum);
            out += net.w2[0][i] * h[i];
        }
        printf("Input [%.0f, %.0f] -> Predicted Breakeven: %.6f (Target: %.6f)\n", 
               raw[s][0], raw[s][1], out, targets[s]);
    }

    return 0;
}
