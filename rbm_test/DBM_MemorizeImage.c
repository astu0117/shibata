#define _USE_MATH_DEFINES
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "SFMT.h"
#include "SFMT.c"

// パラメータ定義
#define NUM_VISIBLE (128 * 128)  // 可視層 (16384)
#define NUM_HIDDEN 200           // 隠れ層（全結合では計算量が膨大なため、例として小さめに設定）
#define NUM_TOTAL (NUM_VISIBLE + NUM_HIDDEN)
#define NUM_SAMPLE 8
#define MAX_EPOCHS 500
#define LEARNING_RATE 0.001L     // long double型のリテラル
#define IMAGE_DATA_PATH "image/image_data.txt"

sfmt_t sfmt;
int seed = 10;

// 全結合用の重み行列とバイアス（long double）
long double *weights; // サイズ: NUM_TOTAL * NUM_TOTAL
long double *biases;  // サイズ: NUM_TOTAL

/* メモリ確保と初期化 */
void initNet(void) {
    printf("--- ネットワーク初期化 (Total Units: %d) ---\n", NUM_TOTAL);
    for (int i = 0; i < NUM_TOTAL; i++) {
        biases[i] = 0.0L;
        for (int j = i + 1; j < NUM_TOTAL; j++) {
            // 対称行列 W_ij = W_ji
            long double w = (long double)(sqrt(-2.0 * log(sfmt_genrand_real2(&sfmt))) * sin(2.0 * M_PI * sfmt_genrand_real2(&sfmt)) * 0.01);
            weights[i * NUM_TOTAL + j] = w;
            weights[j * NUM_TOTAL + i] = w;
        }
        weights[i * NUM_TOTAL + i] = 0.0L; // 自己結合はなし
    }
}

long double sigmoid_ld(long double x) {
    return 1.0L / (1.0L + expl(-x));
}

/* ギブスサンプリング: 全ニューロンの状態を逐次更新 */
void gibbs_sampling(short int* units, int iterations) {
    for (int iter = 0; iter < iterations; iter++) {
        for (int i = 0; i < NUM_TOTAL; i++) {
            long double sum = biases[i];
            for (int j = 0; j < NUM_TOTAL; j++) {
                sum += weights[i * NUM_TOTAL + j] * units[j];
            }
            long double prob = sigmoid_ld(sum);
            units[i] = (sfmt_genrand_real2(&sfmt) < (double)prob) ? 1 : 0;
        }
    }
}

/* 学習関数 */
void train(short int* data_samples) {
    short int* current_units = (short int*)malloc((size_t)NUM_TOTAL * sizeof(short int));
    
    // 計算前に size_t にキャストしてオーバーフローを防ぐ
    size_t total_elements = (size_t)NUM_TOTAL * NUM_TOTAL;
    size_t total_bytes = total_elements * sizeof(long double);

    // calloc の引数も明示的に size_t を使用
    long double* pos_corr = (long double*)calloc(total_elements, sizeof(long double));
    long double* neg_corr = (long double*)calloc(total_elements, sizeof(long double));

    if (pos_corr == NULL || neg_corr == NULL) {
        fprintf(stderr, "メモリ確保に失敗しました（相関行列）\n");
        exit(1);
    }

    for (int epoch = 0; epoch < MAX_EPOCHS; epoch++) {
        // memset のサイズ指定にも計算済みの total_bytes を使用
        memset(pos_corr, 0, total_bytes);
        memset(neg_corr, 0, total_bytes);

        for (int s = 0; s < NUM_SAMPLE; s++) {
            // 1. Positive Phase (可視層をデータに固定)
            for (int i = 0; i < NUM_VISIBLE; i++) current_units[i] = data_samples[s * NUM_VISIBLE + i];
            // 隠れ層のみサンプリング（簡易化）
            for (int i = NUM_VISIBLE; i < NUM_TOTAL; i++) {
                long double sum = biases[i];
                for (int j = 0; j < NUM_TOTAL; j++) sum += weights[i * NUM_TOTAL + j] * current_units[j];
                current_units[i] = (sfmt_genrand_real2(&sfmt) < (double)sigmoid_ld(sum)) ? 1 : 0;
            }
            // 相関の蓄積
            for (int i = 0; i < NUM_TOTAL; i++) {
                for (int j = i + 1; j < NUM_TOTAL; j++) {
                    pos_corr[i * NUM_TOTAL + j] += (current_units[i] * current_units[j]);
                }
            }

            // 2. Negative Phase (何も固定せずサンプリング)
            gibbs_sampling(current_units, 1);
            for (int i = 0; i < NUM_TOTAL; i++) {
                for (int j = i + 1; j < NUM_TOTAL; j++) {
                    neg_corr[i * NUM_TOTAL + j] += (current_units[i] * current_units[j]);
                }
            }
        }

        // 3. 重み更新
        for (int i = 0; i < NUM_TOTAL; i++) {
            for (int j = i + 1; j < NUM_TOTAL; j++) {
                long double delta = LEARNING_RATE * (pos_corr[i * NUM_TOTAL + j] - neg_corr[i * NUM_TOTAL + j]) / NUM_SAMPLE;
                weights[i * NUM_TOTAL + j] += delta;
                weights[j * NUM_TOTAL + i] += delta;
            }
        }
        if (epoch % 10 == 0) printf("Epoch %d finished\n", epoch);
    }
    free(current_units);
    free(pos_corr);
    free(neg_corr);
}
/* 学習済みの全結合重みとバイアスをバイナリファイルに保存する関数 */
void writeNet(char* file_name)
{
    FILE* fp;

    printf("--- ネットワークの重み（long double）とバイアスを出力 ---\n");
    if ((fp = fopen(file_name, "wb")) == NULL){
        printf("ファイルオープンに失敗\n");
        exit(1);
    }

    // 全結合重み行列 (NUM_TOTAL * NUM_TOTAL) を保存
    // 対称行列ですが、読み込みの簡便さのため全要素を書き出します
    fwrite(weights, sizeof(long double), (size_t)NUM_TOTAL * NUM_TOTAL, fp);

    // バイアス (NUM_TOTAL) を保存
    fwrite(biases, sizeof(long double), NUM_TOTAL, fp);

    fclose(fp);
    printf("保存完了: %s\n", file_name);
}



int main(void) {
    // メモリ確保
    weights = (long double*)malloc((size_t)NUM_TOTAL * NUM_TOTAL * sizeof(long double));
    biases = (long double*)malloc(NUM_TOTAL * sizeof(long double));
    short int* data = (short int*)malloc(NUM_SAMPLE * NUM_VISIBLE * sizeof(short int));

    sfmt_init_gen_rand(&sfmt, seed);
    initNet();
    
    // 注: readData関数は元のコードと同じ形式で実装してください
    // readData(data, IMAGE_DATA_PATH); 
    
    train(data);

   
    writeNet("weights_boltzmann.bin");

    printf("学習完了\n");

    free(weights);
    free(biases);
    free(data);
    return 0;
}