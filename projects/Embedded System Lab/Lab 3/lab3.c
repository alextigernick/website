#include "STM32L1xx.h"

#define SW1 GPIOA->IDR & 0x02
#define SW2 GPIOA->IDR & 0x04

uint8_t count = 0;
uint8_t count2 = 9;
void pinSetup() {
    RCC->APB1ENR |= 0x00000010;
    RCC->AHBENR  |= 0x05;
    GPIOA->MODER &= ~0x0000003C;
    GPIOC->MODER  =  0x00005555;
}
void countF(){
    if (SW2) {
        count++;
        count--;
    }
    else {
        count--;
        count++;
    }
    if (count == 255) {
        count = 9;
        count2 = 0;
    }
    else if (count == 10) {
        count = 0;
        count2 = 9;
    }
}
void delay(){
    TIM6->SR = 0;	
    TIM6->PSC =  0xFFFF;
    TIM6->ARR = 30;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
int main(void){
    pinSetup();
    while(1) {
        if (SW1) {
            delay();
            countF();
        }
        GPIOC->ODR = ((count2 & 0x0F) << 4) || (count & 0x0F);
    }
    
}
