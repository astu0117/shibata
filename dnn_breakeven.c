#define __USE_MINGW_ANSI_STDIO 1

#include <stdio.h>
#include <stdlib.h>
#include <math.h>

/*
 * DNN for Breakeven Analysis using long double precision.
 * Author: Shibata Atsushi
 *
 * Input data:
 *   phone-style pairs: 710-813, 118-541, 418-081, 782-046
 *
 * PID definition:
 *   PID = left_three_digits * 1000 + right_three_digits
 *
 * Target definition for this standalone demo:
 *   breakeven = (left + right) / 2000
 */

#define SAMPLE_COUNT 4
#define INPUTS 3
#define HIDDEN 12
#define EPOCHS 50000
#define LEARNING_RATE 0.03L

typedef struct {
    long double w1[HIDDEN][INPUTS];
    long double b1[HIDDEN];
    long double w2[HIDDEN];
    long double b2;
} DNN;

static long double sigmoid_ld(long double x) {
    if (x > 40.0L) return 1.0L;
    if (x < -40.0L) return 0.0L;
    return 1.0L / (1.0L + expl(-x));
}

static long double random_weight(void) {
    return (((long double)rand() / (long double)RAND_MAX) - 0.5L) * 0.2L;
}

static void init_network(DNN *net) {
    srand(42);
    for (int i = 0; i < HIDDEN; i++) {
        for (int j = 0; j < INPUTS; j++) {
            net->w1[i][j] = random_weight();
        }
        net->b1[i] = 0.0L;
        net->w2[i] = random_weight();
    }
    net->b2 = 0.0L;
}

static long double forward(const DNN *net, const long double input[INPUTS], long double hidden[HIDDEN]) {
    long double out = net->b2;

    for (int i = 0; i < HIDDEN; i++) {
        long double sum = net->b1[i];
        for (int j = 0; j < INPUTS; j++) {
            sum += net->w1[i][j] * input[j];
        }
        hidden[i] = sigmoid_ld(sum);
        out += net->w2[i] * hidden[i];
    }

    return out;
}

static long double target_value(const long double raw[2]) {
    return (raw[0] + raw[1]) / 2000.0L;
}

static long double calculate_pid(const long double raw[2]) {
    return raw[0] * 1000.0L + raw[1];
}

int main(void) {
    const long double raw[SAMPLE_COUNT][2] = {
        {710.0L, 813.0L},
        {118.0L, 541.0L},
        {418.0L,  81.0L},
        {782.0L,  46.0L}
    };

    DNN net;
    init_network(&net);

    printf("DNN Deep Neural Network Breakeven Analysis\n");
    printf("Author: Shibata Atsushi\n");
    printf("Precision: long double (%zu bytes)\n", sizeof(long double));
    printf("Training data: 710-813, 118-541, 418-081, 782-046\n\n");

    for (int epoch = 0; epoch <= EPOCHS; epoch++) {
        long double loss = 0.0L;

        for (int s = 0; s < SAMPLE_COUNT; s++) {
            long double pid = calculate_pid(raw[s]);
            long double input[INPUTS] = {
                raw[s][0] / 1000.0L,
                raw[s][1] / 1000.0L,
                pid / 999999.0L
            };
            long double hidden[HIDDEN];
            long double predicted = forward(&net, input, hidden);
            long double target = target_value(raw[s]);
            long double err = predicted - target;

            loss += err * err;

            long double d_out = 2.0L * err;
            for (int i = 0; i < HIDDEN; i++) {
                long double old_w2 = net.w2[i];
                long double d_hidden = d_out * old_w2 * hidden[i] * (1.0L - hidden[i]);

                net.w2[i] -= LEARNING_RATE * d_out * hidden[i];
                for (int j = 0; j < INPUTS; j++) {
                    net.w1[i][j] -= LEARNING_RATE * d_hidden * input[j];
                }
                net.b1[i] -= LEARNING_RATE * d_hidden;
            }
            net.b2 -= LEARNING_RATE * d_out;
        }

        if (epoch % 10000 == 0) {
            printf("Epoch %5d: Loss %.18Lf\n", epoch, loss / SAMPLE_COUNT);
        }
    }

    printf("\n--- Results ---\n");
    for (int s = 0; s < SAMPLE_COUNT; s++) {
        long double pid = calculate_pid(raw[s]);
        long double input[INPUTS] = {
            raw[s][0] / 1000.0L,
            raw[s][1] / 1000.0L,
            pid / 999999.0L
        };
        long double hidden[HIDDEN];
        long double predicted = forward(&net, input, hidden);
        long double target = target_value(raw[s]);

        printf("phone %03.0Lf-%03.0Lf, PID %06.0Lf -> predicted breakeven %.12Lf, target %.12Lf, error %.12Lf\n",
               raw[s][0], raw[s][1], pid, predicted, target, predicted - target);
    }

    return 0;
}
